import type { Special } from "../types";

export const DEFAULT_SPECIALS: Omit<Special, "ownerParticipantId" | "status">[] = [
  {
    id: "wooden-spoon",
    label: "Wooden spoon — first player to lose three teams",
    payoutGbp: 10,
    condition: { type: "wooden_spoon", params: { teamsLost: 3 } },
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
  {
    id: "red-card",
    label: "First team to get a red card",
    payoutGbp: 10,
    condition: { type: "card_in_match", params: { cardType: "red" } },
  },
];

export function specialReferencesTeam(s: Special): string | null {
  if (s.condition.type === "team_advances_to_round") {
    return String(s.condition.params.team).toUpperCase();
  }
  return null;
}
