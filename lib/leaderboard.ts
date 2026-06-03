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

export function computeStandings(
  participants: Participant[],
  allocation: AllocationRecord | null,
  matches: Match[],
): StandingRow[] {
  if (!allocation) {
    return participants.map((p) => ({
      participantId: p.id,
      displayName: p.displayName,
      points: 0,
      teamCodes: [],
      stillIn: false,
      goalsFor: 0,
      goalsAgainst: 0,
    }));
  }

  // Quick lookup: team code -> owning participant id
  const ownerOf = new Map<string, string>();
  for (const a of allocation.byParticipant) {
    for (const code of a.teamCodes) ownerOf.set(code, a.participantId);
  }

  // Compute eliminations by walking matches. A team is eliminated once a
  // knockout match it played in is lost.
  const eliminated = new Set<string>();
  for (const m of matches) {
    if (!m.score) continue;
    if (m.round === "group") continue;
    // The loser of a knockout match is eliminated.
    const winner =
      m.score.home > m.score.away
        ? m.home.code
        : m.score.away > m.score.home
        ? m.away.code
        : null;
    if (winner) {
      const loser =
        winner === m.home.code ? m.away.code : m.home.code;
      eliminated.add(loser);
    } else if (m.status === "pen" || m.status === "ap") {
      // Penalty/extra-time outcome — openfootball usually carries final score;
      // if it's a draw at FT but pen status, we can't tell from the simple model.
      // Leave both as still-in for now and surface as a v2 follow-up.
    }
  }

  const rows: StandingRow[] = participants.map((p) => {
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
        } else if (m.round === "final" && m.score.home > m.score.away) {
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
        } else if (m.round === "final" && m.score.away > m.score.home) {
          points += 10;
        }
        points += KNOCKOUT_ROUND_POINTS[m.round] ?? 0;
      }
    }

    const stillIn = teamCodes.some((code) => !eliminated.has(code));

    return {
      participantId: p.id,
      displayName: p.displayName,
      points,
      teamCodes,
      stillIn,
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

// Pot total = base contribution per paid participant. v1 uses a fixed
// per-head contribution; admin can override.
export function computePotGbp(
  paidCount: number,
  contributionGbp: number = 10,
): number {
  return paidCount * contributionGbp;
}
