// Shared specials-processing pipeline used by BOTH the hourly cron
// (app/api/cron/refresh/route.ts) and the admin "refresh" action
// (app/admin/actions.ts). Keeping this in one place avoids the two paths
// drifting apart — previously the manual action skipped owner attribution,
// wooden-spoon, and streak detection that the cron performed.
//
// Given the freshly-fetched matches, this:
//   1. Seeds specials from defaults if the table is empty.
//   2. Evaluates match-level conditions and attributes claims to team owners.
//   3. Detects the wooden spoon (first fully-eliminated participant).
//   4. Detects the first 6-match winning streak.
// It persists everything it changes and returns a summary.

import {
  getSpecials,
  setSpecials,
  getSpecialCursor,
  setSpecialCursor,
  getAllocation,
  getParticipants,
  getWoodenSpoonWinner,
  setWoodenSpoonWinner,
} from "../db";
import { evaluate } from "./evaluate";
import { DEFAULT_SPECIALS } from "./defaults";
import { computeStandings } from "../leaderboard";
import type { Match } from "../types";

export type ProcessSummary = {
  newClaims: number;
  cursor: string | null;
  woodenSpoonAwarded: boolean;
  streakAwarded: boolean;
};

export async function processSpecials(matches: Match[]): Promise<ProcessSummary> {
  // ── 1. Seed specials if the table is empty ────────────────────────────────
  let specials = await getSpecials();
  if (specials.length === 0) {
    specials = DEFAULT_SPECIALS.map((s) => ({
      ...s,
      ownerParticipantId: null,
      status: "pending" as const,
    }));
    await setSpecials(specials);
  }

  // ── 2. Match-level specials evaluation ────────────────────────────────────
  // Build team → participant map for attributing claims to team owners.
  const [cursor, allocation] = await Promise.all([
    getSpecialCursor(),
    getAllocation(),
  ]);

  const teamOwner = new Map<string, string>();
  if (allocation) {
    for (const a of allocation.byParticipant) {
      for (const code of a.teamCodes) teamOwner.set(code, a.participantId);
    }
  }

  const { newClaims, updatedCursor } = evaluate(matches, specials, cursor);

  if (newClaims.length > 0) {
    const matchById = new Map(matches.map((m) => [m.id, m]));
    const map = new Map(specials.map((s) => [s.id, s] as const));

    for (const c of newClaims) {
      const s = map.get(c.specialId);
      const match = matchById.get(c.matchId);
      if (!s || !match) continue;

      let ownerParticipantId: string | null = s.ownerParticipantId ?? null;
      if (!ownerParticipantId) {
        if (s.condition.type === "min_score_margin" && match.score) {
          const winnerCode =
            match.score.home > match.score.away
              ? match.home.code
              : match.away.code;
          ownerParticipantId = teamOwner.get(winnerCode) ?? null;
        } else if (s.condition.type === "score_at_full_time") {
          ownerParticipantId = teamOwner.get(match.home.code) ?? null;
        } else if (s.condition.type === "card_in_match") {
          // Attribute to the owner of the team that received the (first) card
          // matching the special's type.
          const wantType =
            String(s.condition.params.cardType) === "red" ? "red" : "yellow";
          const card = match.cards.find((cd) => cd.cardType === wantType);
          ownerParticipantId = card ? teamOwner.get(card.teamCode) ?? null : null;
        }
      }

      map.set(c.specialId, {
        ...s,
        ownerParticipantId,
        status: "claimed",
        claimedAt: c.claimedAt,
        claimedMatchId: c.matchId,
      });
    }
    specials = Array.from(map.values());
    await setSpecials(specials);
  }

  if (updatedCursor && updatedCursor !== cursor) {
    await setSpecialCursor(updatedCursor);
  }

  // ── 3. Wooden spoon detection ──────────────────────────────────────────────
  let woodenSpoonAwarded = false;
  const knockoutStarted = matches.some((m) => m.round !== "group" && m.score);
  if (knockoutStarted) {
    const existingWinner = await getWoodenSpoonWinner();
    if (!existingWinner) {
      const participants = await getParticipants();
      const standings = computeStandings(participants, allocation, matches);
      const ws = specials.find((s) => s.condition.type === "wooden_spoon");
      const teamsLost = Number(ws?.condition.params.teamsLost ?? 3);
      // First player to lose `teamsLost` teams. Tie-break: most teams lost,
      // then fewest points, then name (stable).
      const losers = standings
        .filter((r) => r.eliminatedCount >= teamsLost)
        .sort((a, b) =>
          b.eliminatedCount !== a.eliminatedCount
            ? b.eliminatedCount - a.eliminatedCount
            : a.points !== b.points
              ? a.points - b.points
              : a.displayName.localeCompare(b.displayName),
        );
      if (losers.length > 0) {
        const winner = losers[0];
        await setWoodenSpoonWinner(winner.participantId);
        if (ws && ws.status === "pending") {
          specials = specials.map((s) =>
            s.id === ws.id
              ? {
                  ...s,
                  ownerParticipantId: winner.participantId,
                  status: "claimed" as const,
                  claimedAt: new Date().toISOString(),
                }
              : s,
          );
          await setSpecials(specials);
        }
        woodenSpoonAwarded = true;
      }
    }
  }

  // ── 4. Six-match winning streak detection ─────────────────────────────────
  let streakAwarded = false;
  const streakSpecial = specials.find(
    (s) => s.condition.type === "team_consecutive_wins" && s.status === "pending",
  );
  if (streakSpecial) {
    const minWins = Number(streakSpecial.condition.params.minWins ?? 6);
    const finished = matches
      .filter((m) => m.score)
      .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));

    const streaks = new Map<string, number>();
    let firstAchiever: { teamCode: string; matchId: string } | null = null;

    for (const m of finished) {
      if (!m.score || firstAchiever) break;
      const isDraw = m.score.home === m.score.away;
      const winnerCode = isDraw
        ? null
        : m.score.home > m.score.away
          ? m.home.code
          : m.away.code;

      for (const code of [m.home.code, m.away.code]) {
        const prev = streaks.get(code) ?? 0;
        const next = code === winnerCode ? prev + 1 : 0;
        streaks.set(code, next);
        if (next >= minWins && !firstAchiever) {
          firstAchiever = { teamCode: code, matchId: m.id };
        }
      }
    }

    if (firstAchiever) {
      const ownerId = teamOwner.get(firstAchiever.teamCode) ?? null;
      specials = specials.map((s) =>
        s.id === streakSpecial.id
          ? {
              ...s,
              ownerParticipantId: ownerId,
              status: "claimed" as const,
              claimedAt: new Date().toISOString(),
              claimedMatchId: firstAchiever!.matchId,
            }
          : s,
      );
      await setSpecials(specials);
      streakAwarded = true;
    }
  }

  return {
    newClaims: newClaims.length,
    cursor: updatedCursor,
    woodenSpoonAwarded,
    streakAwarded,
  };
}
