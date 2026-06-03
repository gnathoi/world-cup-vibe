// Storage layer: thin typed wrapper over Supabase Postgres.
//
// Every other file imports from here. No one else touches @supabase/supabase-js.
// All calls use the service-role client (server-side only); RLS is default-deny
// at the table level so accidental anon access fails closed.

import { getServiceClient } from "./supabase";
import { KV } from "./kv-keys";
import type {
  Allocation,
  AllocationRecord,
  Comment,
  Match,
  Participant,
  Prediction,
  Special,
  SpecialConditionType,
} from "./types";

// ----- row <-> domain mappers -------------------------------------------

type ParticipantRow = {
  id: string;
  email: string | null;
  display_name: string;
  signed_up_at: string;
  spectator: boolean;
  paid_in: boolean;
};

function toParticipant(r: ParticipantRow): Participant {
  return {
    id: r.id,
    ...(r.email ? { email: r.email } : {}),
    displayName: r.display_name,
    signedUpAt: r.signed_up_at,
    spectator: r.spectator,
    paidIn: r.paid_in,
  };
}

type CommentRow = {
  id: string;
  participant_id: string | null;
  display_name: string;
  body: string;
  match_id: string | null;
  posted_at: string;
};

function toComment(r: CommentRow): Comment {
  return {
    id: r.id,
    participantId: r.participant_id ?? "",
    participantDisplayName: r.display_name,
    body: r.body,
    matchId: r.match_id,
    postedAt: r.posted_at,
  };
}

type PredictionRow = {
  match_id: string;
  participant_id: string;
  home_score: number;
  away_score: number;
  scorer_name: string | null;
  submitted_at: string;
  locked_at: string | null;
};

function toPrediction(r: PredictionRow): Prediction {
  return {
    matchId: r.match_id,
    participantId: r.participant_id,
    homeScore: r.home_score,
    awayScore: r.away_score,
    scorerName: r.scorer_name ?? undefined,
    submittedAt: r.submitted_at,
    lockedAt: r.locked_at ?? undefined,
  };
}

type SpecialRow = {
  id: string;
  label: string;
  payout_gbp: number;
  condition_type: SpecialConditionType;
  condition_params: Record<string, string | number | boolean>;
  owner_participant_id: string | null;
  status: "pending" | "claimed" | "expired";
  claimed_at: string | null;
  claimed_match_id: string | null;
};

function toSpecial(r: SpecialRow): Special {
  return {
    id: r.id,
    label: r.label,
    payoutGbp: r.payout_gbp,
    condition: { type: r.condition_type, params: r.condition_params },
    ownerParticipantId: r.owner_participant_id,
    status: r.status,
    claimedAt: r.claimed_at ?? undefined,
    claimedMatchId: r.claimed_match_id ?? undefined,
  };
}

function fromSpecial(s: Special): SpecialRow {
  return {
    id: s.id,
    label: s.label,
    payout_gbp: s.payoutGbp,
    condition_type: s.condition.type,
    condition_params: s.condition.params,
    owner_participant_id: s.ownerParticipantId,
    status: s.status,
    claimed_at: s.claimedAt ?? null,
    claimed_match_id: s.claimedMatchId ?? null,
  };
}

// ----- participants ------------------------------------------------------

export async function getParticipants(): Promise<Participant[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("participants")
    .select("*")
    .order("signed_up_at", { ascending: true });
  if (error) throw error;
  return (data as ParticipantRow[]).map(toParticipant);
}

export async function getParticipantByEmail(
  email: string,
): Promise<Participant | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("participants")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw error;
  return data ? toParticipant(data as ParticipantRow) : null;
}

export async function getParticipantById(
  id: string,
): Promise<Participant | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("participants")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toParticipant(data as ParticipantRow) : null;
}

export async function getParticipantByUsername(
  username: string,
): Promise<Participant | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("participants")
    .select("*")
    .ilike("display_name", username)
    .maybeSingle();
  if (error) throw error;
  return data ? toParticipant(data as ParticipantRow) : null;
}

export async function addParticipant(p: Participant): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("participants").insert({
    id: p.id,
    email: p.email ?? null,
    display_name: p.displayName,
    signed_up_at: p.signedUpAt,
    spectator: p.spectator,
    paid_in: p.paidIn,
  });
  if (error) throw error;
}

// ----- allocation --------------------------------------------------------

export async function getAllocation(): Promise<AllocationRecord | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("allocations")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    seed: data.seed,
    allocatedAt: data.allocated_at,
    byParticipant: (data.by_participant as Allocation[]) ?? [],
  };
}

export async function setAllocation(record: AllocationRecord): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("allocations").upsert(
    {
      id: 1,
      seed: record.seed,
      allocated_at: record.allocatedAt,
      by_participant: record.byParticipant,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

// ----- comments (banter) -------------------------------------------------

export async function getComments(matchId: string | null): Promise<Comment[]> {
  const sb = getServiceClient();
  let q = sb.from("comments").select("*");
  if (matchId === null) q = q.is("match_id", null);
  else q = q.eq("match_id", matchId);
  const { data, error } = await q
    .order("posted_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data as CommentRow[]).map(toComment);
}

export async function appendComment(c: Comment): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("comments").insert({
    id: c.id,
    participant_id: c.participantId,
    display_name: c.participantDisplayName,
    body: c.body,
    match_id: c.matchId,
    posted_at: c.postedAt,
  });
  if (error) throw error;
}

// ----- predictions -------------------------------------------------------

export async function getPredictionsByParticipant(
  participantId: string,
): Promise<Prediction[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("predictions")
    .select("*")
    .eq("participant_id", participantId);
  if (error) throw error;
  return (data as PredictionRow[]).map(toPrediction);
}

export async function upsertPrediction(p: Prediction): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("predictions").upsert(
    {
      match_id: p.matchId,
      participant_id: p.participantId,
      home_score: p.homeScore,
      away_score: p.awayScore,
      scorer_name: p.scorerName ?? null,
      submitted_at: p.submittedAt,
      locked_at: p.lockedAt ?? null,
    },
    { onConflict: "match_id,participant_id" },
  );
  if (error) throw error;
}

// ----- specials ----------------------------------------------------------

export async function getSpecials(): Promise<Special[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("specials")
    .select("*")
    .order("payout_gbp", { ascending: false });
  if (error) throw error;
  return (data as SpecialRow[]).map(toSpecial);
}

export async function setSpecials(specials: Special[]): Promise<void> {
  const sb = getServiceClient();
  if (specials.length === 0) {
    const { error } = await sb.from("specials").delete().neq("id", "__never__");
    if (error) throw error;
    return;
  }
  const { error } = await sb
    .from("specials")
    .upsert(specials.map(fromSpecial), { onConflict: "id" });
  if (error) throw error;
}

// ----- kv_store helpers (used for openfootball cache + specials cursor) --

async function kvGet<T>(key: string): Promise<T | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("kv_store")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.value as T) : null;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb
    .from("kv_store")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

export async function getWoodenSpoonWinner(): Promise<string | null> {
  return await kvGet<string>(KV.WOODEN_SPOON);
}

export async function setWoodenSpoonWinner(
  participantId: string,
): Promise<void> {
  await kvSet(KV.WOODEN_SPOON, participantId);
}

export async function getSpecialCursor(): Promise<string | null> {
  return await kvGet<string>(KV.SPECIAL_CURSOR);
}

export async function setSpecialCursor(cursor: string): Promise<void> {
  await kvSet(KV.SPECIAL_CURSOR, cursor);
}

export async function getOpenfootballCache(): Promise<{
  matches: Match[];
  fetchedAt: string;
} | null> {
  return await kvGet<{ matches: Match[]; fetchedAt: string }>(
    KV.OPENFOOTBALL_CACHE,
  );
}

export async function setOpenfootballCache(payload: {
  matches: Match[];
  fetchedAt: string;
}): Promise<void> {
  await kvSet(KV.OPENFOOTBALL_CACHE, payload);
}

// ----- pot (paid-in flags live on the participants table) ----------------

export async function getPotPaidBy(): Promise<string[]> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("participants")
    .select("id")
    .eq("paid_in", true);
  if (error) throw error;
  return (data as { id: string }[]).map((r) => r.id);
}

export async function setPotPaidBy(participantIds: string[]): Promise<void> {
  const sb = getServiceClient();
  const idSet = new Set(participantIds);
  // Fetch all participants so we know which to flip.
  const { data: all, error: fetchErr } = await sb
    .from("participants")
    .select("id, paid_in");
  if (fetchErr) throw fetchErr;
  const toPaid: string[] = [];
  const toUnpaid: string[] = [];
  for (const r of (all as { id: string; paid_in: boolean }[]) ?? []) {
    const should = idSet.has(r.id);
    if (should !== r.paid_in) {
      (should ? toPaid : toUnpaid).push(r.id);
    }
  }
  if (toPaid.length > 0) {
    const { error } = await sb
      .from("participants")
      .update({ paid_in: true })
      .in("id", toPaid);
    if (error) throw error;
  }
  if (toUnpaid.length > 0) {
    const { error } = await sb
      .from("participants")
      .update({ paid_in: false })
      .in("id", toUnpaid);
    if (error) throw error;
  }
}

// ----- test reset --------------------------------------------------------
// Only safe to call against a non-production project. Truncates everything.

export async function _resetStoreForTests(): Promise<void> {
  const sb = getServiceClient();
  const tables = [
    "predictions",
    "comments",
    "specials",
    "allocations",
    "kv_store",
    "participants",
  ];
  for (const t of tables) {
    const { error } = await sb.from(t).delete().neq("id", "__never__");
    if (error && !error.message.includes("does not exist")) {
      console.warn(`reset: ${t} -> ${error.message}`);
    }
  }
}
