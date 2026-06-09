// Vercel Cron entry — runs hourly (schedule in vercel.json).
//
// 1. Fetch + cache openfootball.
// 2. Seed specials from defaults if table is empty.
// 3. Run the specials evaluator (match-level conditions).
// 4. Detect wooden spoon (first fully-eliminated participant).
// 5. Detect 6-match winning streak (first team to achieve it).
// 6. Revalidate downstream pages.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshFromOpenfootball } from "@/lib/openfootball";
import {
  getSpecials,
  setSpecials,
  getSpecialCursor,
  setSpecialCursor,
  getAllocation,
  getParticipants,
  getWoodenSpoonWinner,
  setWoodenSpoonWinner,
} from "@/lib/db";
import { evaluate } from "@/lib/specials/evaluate";
import { DEFAULT_SPECIALS } from "@/lib/specials/defaults";
import { computeStandings } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    const fromQuery = new URL(req.url).searchParams.get("secret") ?? "";
    const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : fromQuery;
    if (supplied !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // ── 1. Refresh openfootball ────────────────────────────────────────────────
  let fetchResult;
  try {
    fetchResult = await refreshFromOpenfootball();
  } catch (err) {
    console.error("openfootball refresh failed", err);
    return NextResponse.json(
      { ok: false, stage: "fetch", error: (err as Error).message },
      { status: 503 },
    );
  }

  // ── 2. Seed specials if table is empty ────────────────────────────────────
  let specials = await getSpecials();
  if (specials.length === 0) {
    specials = DEFAULT_SPECIALS.map((s) => ({
      ...s,
      ownerParticipantId: null,
      status: "pending" as const,
    }));
    await setSpecials(specials);
  }

  // ── 3. Match-level specials evaluation ────────────────────────────────────
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

  const { newClaims, updatedCursor } = evaluate(
    fetchResult.matches,
    specials,
    cursor,
  );

  if (newClaims.length > 0) {
    const matchById = new Map(fetchResult.matches.map((m) => [m.id, m]));
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

  // ── 4. Wooden spoon detection ──────────────────────────────────────────────
  let woodenSpoonAwarded = false;
  const knockoutStarted = fetchResult.matches.some(
    (m) => m.round !== "group" && m.score,
  );
  if (knockoutStarted) {
    const existingWinner = await getWoodenSpoonWinner();
    if (!existingWinner) {
      const participants = await getParticipants();
      const standings = computeStandings(
        participants,
        allocation,
        fetchResult.matches,
      );
      const eliminated = standings.filter(
        (r) => !r.stillIn && r.teamCodes.length > 0,
      );
      if (eliminated.length > 0) {
        eliminated.sort((a, b) =>
          a.points !== b.points
            ? a.points - b.points
            : a.displayName.localeCompare(b.displayName),
        );
        const winner = eliminated[0];
        await setWoodenSpoonWinner(winner.participantId);
        const ws = specials.find((s) => s.condition.type === "wooden_spoon");
        if (ws && ws.status === "pending") {
          await setSpecials(
            specials.map((s) =>
              s.id === ws.id
                ? {
                    ...s,
                    ownerParticipantId: winner.participantId,
                    status: "claimed" as const,
                    claimedAt: new Date().toISOString(),
                  }
                : s,
            ),
          );
        }
        woodenSpoonAwarded = true;
      }
    }
  }

  // ── 5. Six-match winning streak detection ─────────────────────────────────
  let streakAwarded = false;
  const streakSpecial = specials.find(
    (s) => s.condition.type === "team_consecutive_wins" && s.status === "pending",
  );
  if (streakSpecial) {
    const minWins = Number(streakSpecial.condition.params.minWins ?? 6);
    const finished = fetchResult.matches
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
      await setSpecials(
        specials.map((s) =>
          s.id === streakSpecial.id
            ? {
                ...s,
                ownerParticipantId: ownerId,
                status: "claimed" as const,
                claimedAt: new Date().toISOString(),
                claimedMatchId: firstAchiever!.matchId,
              }
            : s,
        ),
      );
      streakAwarded = true;
    }
  }

  revalidatePath("/");
  revalidatePath("/me");

  return NextResponse.json({
    ok: true,
    fresh: fetchResult.fresh,
    matches: fetchResult.matches.length,
    newClaims: newClaims.length,
    cursor: updatedCursor,
    woodenSpoonAwarded,
    streakAwarded,
  });
}
