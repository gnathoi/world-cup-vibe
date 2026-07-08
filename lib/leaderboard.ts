// Compute standings from allocation + match results.
//
// Scoring rubric (per design doc):
//   group-stage win  = 3 pts per match owned
//   group-stage draw = 1 pt
//   knockout advancement = 5 pts per round survived
//   final win = 10 pts
//
// Tiebreakers (in order): total goals scored by owned teams, total goals
// conceded (fewer wins), earliest sign-up timestamp.

import type {
  AllocationRecord,
  Match,
  Participant,
} from "./types";

export type StandingRow = {
  participantId: string;
  displayName: string;
  points: number;
  teamCodes: string[];
  stillIn: boolean;
  eliminatedCount: number; // how many of this player's teams are knocked out
  goalsFor: number;
  goalsAgainst: number;
};

const KNOCKOUT_ROUND_POINTS: Record<Match["round"], number> = {
  group: 0,
  round_of_32: 0, // earning by being IN this round; no extra pts for the match itself
  round_of_16: 5,
  quarter: 5,
  semi: 5,
  third_place: 0,
  final: 5,
};

// The decisive score of a match: penalties beat extra time beats full time.
// Group matches never carry et/pens, so this is just the 90-minute score there.
function decisiveScore(
  m: Match,
): { home: number; away: number } | null {
  if (!m.score) return null;
  if (m.score.pens) return m.score.pens;
  if (m.score.et) return m.score.et;
  return { home: m.score.home, away: m.score.away };
}

// Winning team code of a match, or null if genuinely level (a draw at full
// time with no shootout — normal for the group stage, shouldn't happen in the
// knockouts but we guard against incomplete feed data rather than guess).
function matchWinner(m: Match): string | null {
  const s = decisiveScore(m);
  if (!s) return null;
  if (s.home > s.away) return m.home.code;
  if (s.away > s.home) return m.away.code;
  return null;
}

// A team is eliminated if EITHER:
//   (a) the group stage finished and it didn't qualify for the knockouts, OR
//   (b) it lost a knockout match — respecting extra time and penalties.
// Prior versions only handled (b) via the 90-minute score, so group-stage
// exits and shootout defeats were both missed and those teams looked "still in".
export function computeEliminatedTeams(matches: Match[]): Set<string> {
  const eliminated = new Set<string>();

  // The real teams that actually played group games.
  const groupTeams = new Set<string>();
  for (const m of matches) {
    if (m.round === "group") {
      groupTeams.add(m.home.code);
      groupTeams.add(m.away.code);
    }
  }

  // Real teams that reached the knockout bracket: a group-stage team that turns
  // up in any knockout fixture. Placeholder slots ("Winner Group A" → synthetic
  // codes) never played a group game, so they're naturally excluded.
  const knockoutTeams = new Set<string>();
  for (const m of matches) {
    if (m.round === "group") continue;
    if (groupTeams.has(m.home.code)) knockoutTeams.add(m.home.code);
    if (groupTeams.has(m.away.code)) knockoutTeams.add(m.away.code);
  }

  // (a) Group-stage non-qualifiers — but only once the bracket is drawn with
  // real teams. Before that (mid-group-stage) knockoutTeams is empty and we
  // must not declare anyone out on this basis.
  if (knockoutTeams.size > 0) {
    for (const code of groupTeams) {
      if (!knockoutTeams.has(code)) eliminated.add(code);
    }
  }

  // (b) Losers of decided knockout matches.
  for (const m of matches) {
    if (m.round === "group" || !m.score) continue;
    const winner = matchWinner(m);
    if (winner) {
      eliminated.add(winner === m.home.code ? m.away.code : m.home.code);
    }
  }

  return eliminated;
}

export function computeStandings(
  participants: Participant[],
  allocation: AllocationRecord | null,
  matches: Match[],
): StandingRow[] {
  const eligible = participants.filter((p) => !p.spectator);

  if (!allocation) {
    return eligible.map((p) => ({
      participantId: p.id,
      displayName: p.displayName,
      points: 0,
      teamCodes: [],
      stillIn: false,
      eliminatedCount: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    }));
  }

  // Quick lookup: team code -> owning participant id
  const ownerOf = new Map<string, string>();
  for (const a of allocation.byParticipant) {
    for (const code of a.teamCodes) ownerOf.set(code, a.participantId);
  }

  // Eliminations: group-stage non-qualifiers + knockout losers (pen/ET aware).
  const eliminated = computeEliminatedTeams(matches);

  const rows: StandingRow[] = eligible.map((p) => {
    const teamCodes =
      allocation.byParticipant.find((a) => a.participantId === p.id)
        ?.teamCodes ?? [];

    let points = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    for (const m of matches) {
      if (!m.score) continue;
      const homeOwner = ownerOf.get(m.home.code);
      const awayOwner = ownerOf.get(m.away.code);

      if (homeOwner === p.id) {
        goalsFor += m.score.home;
        goalsAgainst += m.score.away;
        if (m.round === "group") {
          if (m.score.home > m.score.away) points += 3;
          else if (m.score.home === m.score.away) points += 1;
        } else if (m.round === "final" && matchWinner(m) === m.home.code) {
          points += 10;
        }
        points += KNOCKOUT_ROUND_POINTS[m.round] ?? 0;
      }
      if (awayOwner === p.id) {
        goalsFor += m.score.away;
        goalsAgainst += m.score.home;
        if (m.round === "group") {
          if (m.score.away > m.score.home) points += 3;
          else if (m.score.home === m.score.away) points += 1;
        } else if (m.round === "final" && matchWinner(m) === m.away.code) {
          points += 10;
        }
        points += KNOCKOUT_ROUND_POINTS[m.round] ?? 0;
      }
    }

    const eliminatedCount = teamCodes.filter((code) => eliminated.has(code)).length;
    const stillIn = teamCodes.some((code) => !eliminated.has(code));

    return {
      participantId: p.id,
      displayName: p.displayName,
      points,
      teamCodes,
      stillIn,
      eliminatedCount,
      goalsFor,
      goalsAgainst,
    };
  });

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (a.goalsAgainst !== b.goalsAgainst)
      return a.goalsAgainst - b.goalsAgainst;
    // Final tiebreaker: by display name to stabilise output.
    return a.displayName.localeCompare(b.displayName);
  });

  return rows;
}

// Pot total = a fixed contribution per allocated team. A player with 3 teams
// contributes 3 × perTeamGbp; the pot is the sum across all allocated teams.
export function computePotGbp(
  totalTeams: number,
  perTeamGbp: number = 2.5,
): number {
  return totalTeams * perTeamGbp;
}
