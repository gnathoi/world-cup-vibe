import type { Special } from "../types";

export const DEFAULT_SPECIALS: Omit<Special, "ownerParticipantId" | "status">[] = [
  {
    id: "wooden-spoon",
    label: "Wooden spoon — first person with all teams out",
    payoutGbp: 20,
    condition: { type: "wooden_spoon", params: {} },
  },
  {
    id: "hat-trick",
    label: "Any player scores a hat-trick",
    payoutGbp: 30,
    condition: { type: "player_hat_trick", params: {} },
  },
  {
    id: "big-win",
    label: "Any team wins by 4 or more goals",
    payoutGbp: 35,
    condition: { type: "min_score_margin", params: { minMargin: 4 } },
  },
  {
    id: "nil-nil",
    label: "Any match ends 0-0",
    payoutGbp: 15,
    condition: {
      type: "score_at_full_time",
      params: { round: "any", home: 0, away: 0 },
    },
  },
];

export function specialReferencesTeam(s: Special): string | null {
  if (s.condition.type === "team_advances_to_round") {
    return String(s.condition.params.team).toUpperCase();
  }
  return null;
}
