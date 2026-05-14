// Keys for the kv_store table (small bag of non-relational state).
// Real domain data (participants, comments, predictions, specials, allocations)
// lives in proper Postgres tables — see supabase/migrations/*.

export const KV = {
  SPECIAL_CURSOR: "specials:processed-cursor",
  OPENFOOTBALL_CACHE: "openfootball:cache",
} as const;
