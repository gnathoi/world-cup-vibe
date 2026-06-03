// Bookies' Specials evaluator.
//
// Pure function: given the current matches + specials list + a cursor of
// last-processed event, return any new claims and an updated cursor. The
// cursor is just "the latest match id that has been fully evaluated" — we
// process matches in kickoff order so this is monotonic.

import type { Match, Special } from "../types";

export type Claim = {
  specialId: string;
  matchId: string;
  claimedAt: string;
};

export type EvaluateOutput = {
  newClaims: Claim[];
  updatedCursor: string | null; // last fully-processed match id (or null if no matches)
};

export function evaluate(
  matches: Match[],
  specials: Special[],
  cursor: string | null,
): EvaluateOutput {
  // Only finished matches contribute events for evaluation.
  const finished = matches
    .filter((m) => m.status === "ft" || m.status === "ap" || m.status === "pen")
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));

  // Skip everything up to and including the cursor.
  const startIdx = cursor
    ? finished.findIndex((m) => m.id === cursor) + 1
    : 0;
  const toProcess = finished.slice(startIdx >= 0 ? startIdx : 0);

  const now = new Date().toISOString();
  const newClaims: Claim[] = [];
  const claimedThisRun = new Set<string>(); // specialId
  const alreadyClaimed = new Set(
    specials.filter((s) => s.status === "claimed").map((s) => s.id),
  );

  for (const match of toProcess) {
    for (const special of specials) {
      if (alreadyClaimed.has(special.id)) continue;
      if (claimedThisRun.has(special.id)) continue;
      if (special.status === "expired") continue;

      if (matchSatisfies(match, special)) {
        newClaims.push({
          specialId: special.id,
          matchId: match.id,
          claimedAt: now,
        });
        claimedThisRun.add(special.id);
      }
    }
  }

  const updatedCursor =
    toProcess.length > 0
      ? toProcess[toProcess.length - 1].id
      : cursor;

  return { newClaims, updatedCursor };
}

// ----- Per-condition evaluators ------------------------------------------

function matchSatisfies(match: Match, special: Special): boolean {
  switch (special.condition.type) {
    case "score_at_full_time":
      return evaluateScoreAtFullTime(match, special.condition.params);
    case "player_hat_trick":
      return evaluateHatTrick(match);
    case "goal_within_minute":
      return evaluateGoalWithinMinute(match, special.condition.params);
    case "team_advances_to_round":
      return evaluateTeamAdvances(match, special.condition.params);
    case "match_outcome":
      return evaluateMatchOutcome(match, special.condition.params);
    case "card_in_match":
      return evaluateCardInMatch(match, special.condition.params);
    case "min_score_margin":
      return evaluateMinScoreMargin(match, special.condition.params);
    case "wooden_spoon":
    case "team_consecutive_wins":
      return false; // handled separately in the cron route
    default:
      return false;
  }
}

export function evaluateScoreAtFullTime(
  match: Match,
  params: Record<string, string | number | boolean>,
): boolean {
  if (!match.score) return false;
  const round = (params.round as string | undefined) ?? "any";
  if (round !== "any" && round !== match.round) return false;
  const home = Number(params.home);
  const away = Number(params.away);
  return (
    (match.score.home === home && match.score.away === away) ||
    (match.score.home === away && match.score.away === home)
  );
}

export function evaluateHatTrick(match: Match): boolean {
  const goalsByScorer = new Map<string, number>();
  for (const goal of match.goals) {
    if (goal.isOwnGoal) continue;
    const key = `${goal.teamCode}::${goal.scorerName}`;
    goalsByScorer.set(key, (goalsByScorer.get(key) ?? 0) + 1);
  }
  for (const count of goalsByScorer.values()) {
    if (count >= 3) return true;
  }
  return false;
}

export function evaluateGoalWithinMinute(
  match: Match,
  params: Record<string, string | number | boolean>,
): boolean {
  const maxMinute = Number(params.maxMinute);
  const round = (params.round as string | undefined) ?? "any";
  if (round !== "any" && round !== match.round) return false;
  return match.goals.some((g) => g.minute <= maxMinute);
}

export function evaluateTeamAdvances(
  match: Match,
  params: Record<string, string | number | boolean>,
): boolean {
  const team = String(params.team).toUpperCase();
  const round = String(params.round);
  if (match.round !== round) return false;
  return match.home.code === team || match.away.code === team;
}

export function evaluateMatchOutcome(
  match: Match,
  params: Record<string, string | number | boolean>,
): boolean {
  if (!match.score) return false;
  const round = (params.round as string | undefined) ?? "any";
  if (round !== "any" && round !== match.round) return false;
  const outcome = String(params.outcome);
  if (outcome === "draw") return match.score.home === match.score.away;
  if (outcome === "shootout") return match.status === "pen";
  return false;
}

export function evaluateMinScoreMargin(
  match: Match,
  params: Record<string, string | number | boolean>,
): boolean {
  if (!match.score) return false;
  const minMargin = Number(params.minMargin);
  const margin = Math.abs(match.score.home - match.score.away);
  const round = (params.round as string | undefined) ?? "any";
  if (round !== "any" && round !== match.round) return false;
  return margin >= minMargin;
}

export function evaluateCardInMatch(
  match: Match,
  params: Record<string, string | number | boolean>,
): boolean {
  const cardType = String(params.cardType) === "red" ? "red" : "yellow";
  const round = (params.round as string | undefined) ?? "any";
  if (round !== "any" && round !== match.round) return false;
  return match.cards.some((c) => c.cardType === cardType);
}
