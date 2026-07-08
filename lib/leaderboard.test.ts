import { describe, it, expect } from "vitest";
import { computeEliminatedTeams } from "./leaderboard";
import type { Match } from "./types";

// Minimal match factory. `round` defaults to group; pass et/pens to model
// knockout ties that go beyond 90 minutes.
function match(
  round: Match["round"],
  home: string,
  away: string,
  score?: Match["score"],
): Match {
  return {
    id: `${round}-${home}-${away}`,
    matchDay: 1,
    date: "2026-06-11",
    kickoffUtc: "2026-06-11T12:00:00.000Z",
    round,
    home: { code: home, name: home },
    away: { code: away, name: away },
    status: score ? (score.pens ? "pen" : score.et ? "ap" : "ft") : "scheduled",
    score,
    goals: [],
    cards: [],
  };
}

// A tiny group stage: four teams, AAA/BBB advance, CCC/DDD do not.
const GROUP: Match[] = [
  match("group", "AAA", "CCC", { home: 2, away: 0 }),
  match("group", "BBB", "DDD", { home: 1, away: 0 }),
];

describe("computeEliminatedTeams", () => {
  it("marks group-stage non-qualifiers as eliminated once the bracket is drawn", () => {
    // AAA & BBB reach the knockouts; CCC & DDD never appear there.
    const matches = [...GROUP, match("round_of_16", "AAA", "BBB")];
    const out = computeEliminatedTeams(matches);
    expect(out.has("CCC")).toBe(true);
    expect(out.has("DDD")).toBe(true);
    // Neither knockout team has lost yet.
    expect(out.has("AAA")).toBe(false);
    expect(out.has("BBB")).toBe(false);
  });

  it("eliminates nobody on the group basis while the group stage is still on", () => {
    // No knockout fixtures yet -> we cannot know who failed to qualify.
    const out = computeEliminatedTeams(GROUP);
    expect(out.size).toBe(0);
  });

  it("eliminates the loser of a knockout decided in normal time", () => {
    const matches = [
      ...GROUP,
      match("round_of_16", "AAA", "BBB", { home: 2, away: 1 }),
    ];
    const out = computeEliminatedTeams(matches);
    expect(out.has("BBB")).toBe(true); // lost 1-2
    expect(out.has("AAA")).toBe(false);
  });

  it("uses the penalty shootout to decide a knockout drawn at full time", () => {
    // Level at 90' and after extra time; BBB win the shootout 4-2.
    const matches = [
      ...GROUP,
      match("round_of_16", "AAA", "BBB", {
        home: 1,
        away: 1,
        et: { home: 1, away: 1 },
        pens: { home: 2, away: 4 },
      }),
    ];
    const out = computeEliminatedTeams(matches);
    expect(out.has("AAA")).toBe(true); // lost on penalties
    expect(out.has("BBB")).toBe(false);
  });

  it("uses the extra-time result when a tie is settled before penalties", () => {
    // Drawn at 90', AAA win it in extra time 3-2, no shootout.
    const matches = [
      ...GROUP,
      match("round_of_16", "AAA", "BBB", {
        home: 2,
        away: 2,
        et: { home: 3, away: 2 },
      }),
    ];
    const out = computeEliminatedTeams(matches);
    expect(out.has("BBB")).toBe(true); // lost in extra time
    expect(out.has("AAA")).toBe(false);
  });
});
