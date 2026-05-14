// Match simulator for the /admin demo mode.
//
// Goal: take an existing pre-tournament openfootball snapshot (104 fixtures
// with no scores) and turn it into a finished tournament's worth of data,
// advancing match-by-match so the leaderboard shifts live in front of you.
//
// The simulator is deterministic from a seed so the same demo replays the
// same fictional tournament — useful for screenshots and for testing.

import seedrandom from "seedrandom";
import type { Match, GoalEvent } from "../types";

const FIRST_NAMES = [
  "Vinicius",
  "Mbappé",
  "Bellingham",
  "Pulisic",
  "Salah",
  "Saka",
  "Foden",
  "Rodriguez",
  "Lopez",
  "Schmidt",
  "Müller",
  "Yamal",
];

const SURNAMES = [
  "Silva",
  "Diaz",
  "Hernandez",
  "Park",
  "Tanaka",
  "Kovac",
  "Sow",
  "Nielsen",
  "Bruyne",
  "Sanchez",
  "Ali",
  "Khan",
];

function pickName(rng: seedrandom.PRNG): string {
  const f = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  const s = SURNAMES[Math.floor(rng() * SURNAMES.length)];
  return `${f} ${s}`;
}

function poissonGoals(rng: seedrandom.PRNG, mean = 1.4): number {
  // Inverse-CDF sampling for a Poisson distribution. World Cup matches
  // average ~1.4 goals per team, which makes 0-0, 1-0, 2-1, 3-2 the most
  // common outcomes and 5-4 thrillers genuinely rare.
  const L = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

export type SimulatedMatch = {
  match: Match;
  shootoutWinner?: "home" | "away";
};

/**
 * Advance a single match to a final result. Adds goals + maybe a red card.
 * Knockout matches that end level go to a penalty shootout (status="pen"
 * and the score reflects the eventual winner).
 */
export function simulateMatch(match: Match, seed: string): SimulatedMatch {
  if (match.status === "ft" || match.status === "ap" || match.status === "pen") {
    return { match };
  }
  const rng = seedrandom(`${seed}:${match.id}`);
  const homeAdvantage = 0.2; // small bias toward team1
  let home = poissonGoals(rng, 1.4 + homeAdvantage);
  let away = poissonGoals(rng, 1.4);

  // Knockout matches can't end in a draw — penalty shootout decides.
  let status: Match["status"] = "ft";
  let shootoutWinner: "home" | "away" | undefined;
  if (
    home === away &&
    match.round !== "group" &&
    match.round !== "third_place"
  ) {
    status = "pen";
    if (rng() < 0.5) {
      shootoutWinner = "home";
      home = home + 1; // representational; openfootball uses ft score
    } else {
      shootoutWinner = "away";
      away = away + 1;
    }
  }

  const goals: GoalEvent[] = [];
  const minutes = new Set<number>();
  function pickMinute(): number {
    let m = 0;
    while (true) {
      m = Math.max(1, Math.min(90, Math.floor(rng() * 90) + 1));
      if (!minutes.has(m)) {
        minutes.add(m);
        return m;
      }
    }
  }

  // Decide a hat-trick scorer occasionally (~1 in 30 matches with 3+ home goals).
  let homeHatTrickName: string | null = null;
  if (home >= 3 && rng() < 0.5) homeHatTrickName = pickName(rng);
  let awayHatTrickName: string | null = null;
  if (away >= 3 && rng() < 0.3) awayHatTrickName = pickName(rng);

  for (let i = 0; i < home; i++) {
    goals.push({
      matchId: match.id,
      minute: pickMinute(),
      scorerName: homeHatTrickName ?? pickName(rng),
      teamCode: match.home.code,
    });
  }
  for (let i = 0; i < away; i++) {
    goals.push({
      matchId: match.id,
      minute: pickMinute(),
      scorerName: awayHatTrickName ?? pickName(rng),
      teamCode: match.away.code,
    });
  }
  goals.sort((a, b) => a.minute - b.minute);

  // 8% chance of a red card (a bit higher than reality so demos are eventful).
  const cards = match.cards.slice();
  if (rng() < 0.08) {
    cards.push({
      matchId: match.id,
      minute: Math.floor(rng() * 80) + 10,
      playerName: pickName(rng),
      teamCode: rng() < 0.5 ? match.home.code : match.away.code,
      cardType: "red",
    });
  }

  return {
    match: {
      ...match,
      status,
      score: { home, away },
      goals,
      cards,
    },
    shootoutWinner,
  };
}

/**
 * Pick the next match to advance. Returns null if every match is already
 * finished. We process in kickoffUtc order so the demo unfolds chronologically.
 */
export function nextUnplayedMatch(matches: Match[]): Match | null {
  for (const m of matches.sort((a, b) =>
    a.kickoffUtc.localeCompare(b.kickoffUtc),
  )) {
    if (m.status === "scheduled") return m;
  }
  return null;
}
