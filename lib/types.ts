// Domain types + the shared server-action result envelope.

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type Participant = {
  id: string;
  email: string;
  displayName: string;
  signedUpAt: string; // ISO 8601
  spectator: boolean; // true if signed up after allocation lock
  paidIn: boolean;
};

export type Allocation = {
  participantId: string;
  teamCodes: string[]; // FIFA 3-letter codes, e.g. ["BRA", "SUI"]
};

export type AllocationRecord = {
  seed: string;
  allocatedAt: string; // ISO 8601
  byParticipant: Allocation[];
};

export type Comment = {
  id: string;
  participantId: string;
  participantDisplayName: string;
  body: string;
  matchId: string | null; // null = global
  postedAt: string;
};

export type Prediction = {
  matchId: string;
  participantId: string;
  homeScore: number;
  awayScore: number;
  scorerName?: string;
  submittedAt: string;
  lockedAt?: string;
};

// Bookies' Special — see design doc for full taxonomy
export type SpecialConditionType =
  | "score_at_full_time"
  | "player_hat_trick"
  | "goal_within_minute"
  | "team_advances_to_round"
  | "match_outcome"
  | "card_in_match";

export type Special = {
  id: string;
  label: string;
  payoutGbp: number;
  condition: {
    type: SpecialConditionType;
    params: Record<string, string | number | boolean>;
  };
  ownerParticipantId: string | null; // null until allocation; rule in design doc
  status: "pending" | "claimed" | "expired";
  claimedAt?: string;
  claimedMatchId?: string;
};

// openfootball normalized shapes (post-adapter, not raw)
export type Match = {
  id: string;
  matchDay: number;
  date: string; // ISO
  kickoffUtc: string; // ISO
  group?: string;
  round: "group" | "round_of_32" | "round_of_16" | "quarter" | "semi" | "third_place" | "final";
  home: { code: string; name: string };
  away: { code: string; name: string };
  status: "scheduled" | "live" | "ft" | "ap" | "pen";
  score?: { home: number; away: number; ht?: { home: number; away: number } };
  goals: GoalEvent[];
  cards: CardEvent[];
};

export type GoalEvent = {
  minute: number;
  scorerName: string;
  teamCode: string;
  matchId: string;
  isOwnGoal?: boolean;
  isPenalty?: boolean;
};

export type CardEvent = {
  minute: number;
  playerName: string;
  teamCode: string;
  matchId: string;
  cardType: "yellow" | "red";
};

export type SweepData = {
  participants: Participant[];
  allocation: AllocationRecord | null;
  comments: Comment[];
  predictions: Prediction[];
  specials: Special[];
  potPaidBy: string[]; // participant IDs who have paid in
  openfootballCache: { matches: Match[]; fetchedAt: string } | null;
  specialCursor: string | null;
};
