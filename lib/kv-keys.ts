// Central registry of every Redis/KV key used by the app.
// Every db.ts call must import from here. No raw key strings elsewhere.

export const KV = {
  PARTICIPANTS: "participants:list",
  PARTICIPANT_BY_ID: (id: string) => `participant:${id}`,
  PARTICIPANT_BY_EMAIL: (email: string) =>
    `participant:email:${email.toLowerCase()}`,

  ALLOCATION_SEED: "allocation:seed",
  ALLOCATION_AT: "allocation:at",
  ALLOCATIONS: "allocations:by-participant",

  COMMENTS_GLOBAL: "comments:global",
  COMMENTS_MATCH: (matchId: string) => `comments:match:${matchId}`,

  PREDICTIONS_BY_MATCH: (matchId: string) => `predictions:match:${matchId}`,
  PREDICTIONS_BY_PARTICIPANT: (participantId: string) =>
    `predictions:participant:${participantId}`,

  SPECIALS_LIST: "specials:list",
  SPECIAL_CURSOR: "specials:processed-cursor",

  OPENFOOTBALL_CACHE: "openfootball:cache",
  OPENFOOTBALL_FETCHED_AT: "openfootball:fetched-at",

  POT: "pot:ledger",
  POT_PAID: "pot:paid-by-participant",
} as const;
