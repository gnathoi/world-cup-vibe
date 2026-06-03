import type { Special } from "../types";

export const DEFAULT_SPECIALS: Omit<Special, "ownerParticipantId" | "status">[] = [
  {
    id: "wooden-spoon",
    label: "Wooden spoon — first player with all teams knocked out",
    payoutGbp: 10,
    condition: { type: "wooden_spoon", params: {} },
  },
  {
    id: "big-win",
    label: "First team to win by 4 or more goals",
    payoutGbp: 10,
    condition: { type: "min_score_margin", params: { minMargin: 4 } },
  },
  {
    id: "six-in-a-row",
    label: "First team to win 6 matches in a row",
    payoutGbp: 10,
    condition: { type: "team_consecutive_wins", params: { minWins: 6 } },
  },
];

export function specialReferencesTeam(s: Special): string | null {
  if (s.condition.type === "team_advances_to_round") {
    return String(s.condition.params.team).toUpperCase();
  }
  return null;
}
