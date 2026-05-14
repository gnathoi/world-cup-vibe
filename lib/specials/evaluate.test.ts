import { describe, it, expect } from "vitest";
import {
  evaluate,
  evaluateScoreAtFullTime,
  evaluateHatTrick,
  evaluateGoalWithinMinute,
  evaluateTeamAdvances,
  evaluateMatchOutcome,
  evaluateCardInMatch,
} from "./evaluate";
import type { Match, Special } from "../types";

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: overrides.id ?? "m1",
    matchDay: 1,
    date: "2026-06-15",
    kickoffUtc: "2026-06-15T18:00:00Z",
    round: "group",
    home: { code: "BRA", name: "Brazil" },
    away: { code: "SUI", name: "Switzerland" },
    status: "ft",
    score: { home: 2, away: 1 },
    goals: [],
    cards: [],
    ...overrides,
  };
}

function special(
  id: string,
  partial: Partial<Special> = {},
): Special {
  return {
    id,
    label: id,
    payoutGbp: 10,
    condition: { type: "player_hat_trick", params: {} },
    ownerParticipantId: "p1",
    status: "pending",
    ...partial,
  };
}

describe("per-condition evaluators", () => {
  it("score_at_full_time: matches regardless of which team is home/away", () => {
    const m = match({ score: { home: 2, away: 1 } });
    expect(
      evaluateScoreAtFullTime(m, { home: 2, away: 1 }),
    ).toBe(true);
    expect(
      evaluateScoreAtFullTime(m, { home: 1, away: 2 }),
    ).toBe(true);
    expect(
      evaluateScoreAtFullTime(m, { home: 0, away: 0 }),
    ).toBe(false);
  });

  it("score_at_full_time: requires round when specified", () => {
    const m = match({ round: "group", score: { home: 0, away: 0 } });
    expect(
      evaluateScoreAtFullTime(m, { round: "final", home: 0, away: 0 }),
    ).toBe(false);
  });

  it("player_hat_trick: detects 3+ goals by the same scorer in one match", () => {
    const m = match({
      goals: [
        { matchId: "m1", minute: 12, scorerName: "Vinicius", teamCode: "BRA" },
        { matchId: "m1", minute: 34, scorerName: "Vinicius", teamCode: "BRA" },
        { matchId: "m1", minute: 67, scorerName: "Vinicius", teamCode: "BRA" },
      ],
    });
    expect(evaluateHatTrick(m)).toBe(true);
  });

  it("player_hat_trick: ignores own goals", () => {
    const m = match({
      goals: [
        {
          matchId: "m1",
          minute: 12,
          scorerName: "Vinicius",
          teamCode: "BRA",
        },
        {
          matchId: "m1",
          minute: 34,
          scorerName: "Vinicius",
          teamCode: "BRA",
        },
        {
          matchId: "m1",
          minute: 67,
          scorerName: "Vinicius",
          teamCode: "BRA",
          isOwnGoal: true,
        },
      ],
    });
    expect(evaluateHatTrick(m)).toBe(false);
  });

  it("goal_within_minute: matches if any goal is within the threshold", () => {
    const m = match({
      goals: [
        { matchId: "m1", minute: 1, scorerName: "X", teamCode: "BRA" },
      ],
    });
    expect(evaluateGoalWithinMinute(m, { maxMinute: 1 })).toBe(true);
    expect(evaluateGoalWithinMinute(m, { maxMinute: 0 })).toBe(false);
  });

  it("team_advances_to_round: requires the round to match exactly", () => {
    const semi = match({ round: "semi" });
    expect(
      evaluateTeamAdvances(semi, { team: "BRA", round: "semi" }),
    ).toBe(true);
    expect(
      evaluateTeamAdvances(semi, { team: "BRA", round: "final" }),
    ).toBe(false);
    expect(
      evaluateTeamAdvances(semi, { team: "ARG", round: "semi" }),
    ).toBe(false);
  });

  it("match_outcome=shootout requires status==pen", () => {
    const finalPen = match({ round: "final", status: "pen", score: { home: 1, away: 1 } });
    expect(
      evaluateMatchOutcome(finalPen, { round: "final", outcome: "shootout" }),
    ).toBe(true);
    const finalFt = match({ round: "final", status: "ft", score: { home: 1, away: 1 } });
    expect(
      evaluateMatchOutcome(finalFt, { round: "final", outcome: "shootout" }),
    ).toBe(false);
  });

  it("card_in_match=red detects red cards only", () => {
    const m = match({
      round: "final",
      cards: [
        {
          matchId: "m1",
          minute: 50,
          playerName: "X",
          teamCode: "BRA",
          cardType: "red",
        },
      ],
    });
    expect(
      evaluateCardInMatch(m, { round: "final", cardType: "red" }),
    ).toBe(true);
    expect(
      evaluateCardInMatch(m, { round: "final", cardType: "yellow" }),
    ).toBe(false);
  });
});

describe("evaluate() — cursor and claims", () => {
  it("returns no claims when there are no finished matches", () => {
    const result = evaluate([], [special("s1")], null);
    expect(result.newClaims).toEqual([]);
    expect(result.updatedCursor).toBeNull();
  });

  it("claims a hat-trick exactly once per special", () => {
    const m = match({
      id: "m-hat",
      goals: [
        { matchId: "m-hat", minute: 1, scorerName: "X", teamCode: "BRA" },
        { matchId: "m-hat", minute: 2, scorerName: "X", teamCode: "BRA" },
        { matchId: "m-hat", minute: 3, scorerName: "X", teamCode: "BRA" },
      ],
    });
    const result = evaluate([m], [special("hat-trick")], null);
    expect(result.newClaims).toHaveLength(1);
    expect(result.newClaims[0].specialId).toBe("hat-trick");
    expect(result.updatedCursor).toBe("m-hat");
  });

  it("the cursor blocks re-evaluation of an already-processed match", () => {
    const m = match({
      id: "m-hat",
      goals: [
        { matchId: "m-hat", minute: 1, scorerName: "X", teamCode: "BRA" },
        { matchId: "m-hat", minute: 2, scorerName: "X", teamCode: "BRA" },
        { matchId: "m-hat", minute: 3, scorerName: "X", teamCode: "BRA" },
      ],
    });
    // Start from a cursor that already includes m-hat — should not re-claim.
    const result = evaluate([m], [special("hat-trick")], "m-hat");
    expect(result.newClaims).toHaveLength(0);
  });

  it("already-claimed specials are not re-claimed", () => {
    const m = match({
      id: "m-hat",
      goals: [
        { matchId: "m-hat", minute: 1, scorerName: "X", teamCode: "BRA" },
        { matchId: "m-hat", minute: 2, scorerName: "X", teamCode: "BRA" },
        { matchId: "m-hat", minute: 3, scorerName: "X", teamCode: "BRA" },
      ],
    });
    const result = evaluate(
      [m],
      [special("hat-trick", { status: "claimed", claimedMatchId: "older-match" })],
      null,
    );
    expect(result.newClaims).toHaveLength(0);
  });

  it("processes matches in kickoff order so the earliest triggering match wins", () => {
    const m1 = match({
      id: "m-early",
      kickoffUtc: "2026-06-15T10:00:00Z",
      goals: [
        { matchId: "m-early", minute: 1, scorerName: "A", teamCode: "BRA" },
        { matchId: "m-early", minute: 2, scorerName: "A", teamCode: "BRA" },
        { matchId: "m-early", minute: 3, scorerName: "A", teamCode: "BRA" },
      ],
    });
    const m2 = match({
      id: "m-late",
      kickoffUtc: "2026-06-15T18:00:00Z",
      goals: [
        { matchId: "m-late", minute: 1, scorerName: "B", teamCode: "ARG" },
        { matchId: "m-late", minute: 2, scorerName: "B", teamCode: "ARG" },
        { matchId: "m-late", minute: 3, scorerName: "B", teamCode: "ARG" },
      ],
    });
    const result = evaluate([m2, m1], [special("hat-trick")], null);
    expect(result.newClaims).toHaveLength(1);
    expect(result.newClaims[0].matchId).toBe("m-early");
    expect(result.updatedCursor).toBe("m-late");
  });
});
