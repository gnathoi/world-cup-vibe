// Default curated Bookies' Specials. Admin-editable until allocation lock.
// owner_participant_id remains null until the allocator runs.

import type { Special } from "../types";

export const DEFAULT_SPECIALS: Omit<Special, "ownerParticipantId" | "status">[] = [
  {
    id: "zero-zero-final",
    label: "0-0 in the Final",
    payoutGbp: 50,
    condition: {
      type: "score_at_full_time",
      params: { round: "final", home: 0, away: 0 },
    },
  },
  {
    id: "hat-trick",
    label: "Any player scores a hat-trick",
    payoutGbp: 25,
    condition: { type: "player_hat_trick", params: {} },
  },
  {
    id: "usa-semi",
    label: "USA reaches the semi-final",
    payoutGbp: 75,
    condition: {
      type: "team_advances_to_round",
      params: { team: "USA", round: "semi" },
    },
  },
  {
    id: "penalty-shootout-final",
    label: "Penalty shoot-out in the Final",
    payoutGbp: 15,
    condition: {
      type: "match_outcome",
      params: { round: "final", outcome: "shootout" },
    },
  },
  {
    id: "early-final-goal",
    label: "Goal within the first 60 seconds of the Final",
    payoutGbp: 20,
    condition: {
      type: "goal_within_minute",
      params: { round: "final", maxMinute: 1 },
    },
  },
  {
    id: "red-card-final",
    label: "Red card in the Final",
    payoutGbp: 15,
    condition: {
      type: "card_in_match",
      params: { round: "final", cardType: "red" },
    },
  },
];

// Conditions that reference a specific team (owner = that team's holder)
export function specialReferencesTeam(s: Special): string | null {
  if (s.condition.type === "team_advances_to_round") {
    return String(s.condition.params.team).toUpperCase();
  }
  return null;
}
