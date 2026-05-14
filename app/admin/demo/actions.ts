"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import {
  addParticipant,
  getParticipants,
  setAllocation,
  setSpecials,
  setOpenfootballCache,
  setSpecialCursor,
  getOpenfootballCache,
  getSpecials,
  setPotPaidBy,
} from "@/lib/db";
import { getServiceClient } from "@/lib/supabase";
import { allocate, assignByRandom } from "@/lib/allocator";
import { TEAMS_2026, HOST_NATIONS } from "@/lib/teams";
import {
  DEFAULT_SPECIALS,
  specialReferencesTeam,
} from "@/lib/specials/defaults";
import { refreshFromOpenfootball } from "@/lib/openfootball";
import { evaluate } from "@/lib/specials/evaluate";
import {
  simulateMatch,
  nextUnplayedMatch,
} from "@/lib/demo/simulator";
import type { Participant, Special } from "@/lib/types";

const DEMO_SEED = "lee-cattermole-2026";

const DEMO_PEOPLE: { displayName: string; emailLocal: string }[] = [
  { displayName: "Lee Cattermole", emailLocal: "lee" },
  { displayName: "Nat", emailLocal: "nat" },
  { displayName: "Sarah", emailLocal: "sarah" },
  { displayName: "Jordan", emailLocal: "jordan" },
  { displayName: "Maya", emailLocal: "maya" },
  { displayName: "Tom", emailLocal: "tom" },
  { displayName: "Priya", emailLocal: "priya" },
  { displayName: "Ben", emailLocal: "ben" },
  { displayName: "Hannah", emailLocal: "hannah" },
  { displayName: "Felipe", emailLocal: "felipe" },
  { displayName: "Aoife", emailLocal: "aoife" },
  { displayName: "Marcus", emailLocal: "marcus" },
];

// No auth gate — admin is currently open, so demo controls are too.
// When/if /admin gets a password again, add a session check here.

export async function startDemoAction() {
  await wipeEverything();

  const created: Participant[] = [];
  for (let i = 0; i < DEMO_PEOPLE.length; i++) {
    const p = DEMO_PEOPLE[i];
    const participant: Participant = {
      id: randomUUID(),
      email: `${p.emailLocal}@demo.goal-2026.local`,
      displayName: p.displayName,
      signedUpAt: new Date(
        Date.now() - (DEMO_PEOPLE.length - i) * 60_000,
      ).toISOString(),
      spectator: false,
      paidIn: true,
    };
    await addParticipant(participant);
    created.push(participant);
  }

  const { byParticipantId } = allocate(
    created,
    TEAMS_2026,
    DEMO_SEED,
    HOST_NATIONS,
  );
  await setAllocation({
    seed: DEMO_SEED,
    allocatedAt: new Date().toISOString(),
    byParticipant: Object.entries(byParticipantId).map(
      ([participantId, teamCodes]) => ({ participantId, teamCodes }),
    ),
  });

  await setPotPaidBy(created.map((p) => p.id));

  const specials = DEFAULT_SPECIALS.map<Special>((s) => ({
    ...s,
    ownerParticipantId: null,
    status: "pending",
  }));
  const teamOwner = new Map<string, string>();
  for (const [pid, codes] of Object.entries(byParticipantId)) {
    for (const code of codes) teamOwner.set(code, pid);
  }
  const withOwners: Special[] = [];
  const orphan: Special[] = [];
  for (const s of specials) {
    const teamRef = specialReferencesTeam(s);
    if (teamRef && teamOwner.has(teamRef)) {
      withOwners.push({ ...s, ownerParticipantId: teamOwner.get(teamRef)! });
    } else {
      orphan.push(s);
    }
  }
  for (const r of assignByRandom(orphan, created, DEMO_SEED + ":specials")) {
    withOwners.push({ ...r.item, ownerParticipantId: r.participantId });
  }
  await setSpecials(withOwners);

  await refreshFromOpenfootball();

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/admin");
  revalidatePath("/ceremony");
}

export async function tickDemoAction(): Promise<{
  done: boolean;
  matchId: string | null;
  scoreLine: string | null;
  matchesPlayed: number;
  totalMatches: number;
}> {
  const cache = await getOpenfootballCache();
  if (!cache) {
    throw new Error("openfootball cache empty — start the demo first.");
  }

  const next = nextUnplayedMatch(cache.matches);
  const totalMatches = cache.matches.length;
  const matchesPlayed = cache.matches.filter(
    (m) => m.status !== "scheduled",
  ).length;

  if (!next) {
    return {
      done: true,
      matchId: null,
      scoreLine: null,
      matchesPlayed,
      totalMatches,
    };
  }

  const { match: simulated } = simulateMatch(next, DEMO_SEED);
  const updatedMatches = cache.matches.map((m) =>
    m.id === simulated.id ? simulated : m,
  );
  await setOpenfootballCache({
    matches: updatedMatches,
    fetchedAt: new Date().toISOString(),
  });

  const specials = await getSpecials();
  const { newClaims, updatedCursor } = evaluate(updatedMatches, specials, null);
  if (newClaims.length > 0) {
    const map = new Map(specials.map((s) => [s.id, s] as const));
    for (const c of newClaims) {
      const s = map.get(c.specialId);
      if (s) {
        map.set(c.specialId, {
          ...s,
          status: "claimed",
          claimedAt: c.claimedAt,
          claimedMatchId: c.matchId,
        });
      }
    }
    await setSpecials(Array.from(map.values()));
  }
  if (updatedCursor) {
    await setSpecialCursor(updatedCursor);
  }

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/admin");

  return {
    done: false,
    matchId: simulated.id,
    scoreLine: simulated.score
      ? `${simulated.home.code} ${simulated.score.home} — ${simulated.score.away} ${simulated.away.code}`
      : null,
    matchesPlayed: matchesPlayed + 1,
    totalMatches,
  };
}

export async function resetDemoAction() {
  await wipeEverything();
  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/admin");
  revalidatePath("/ceremony");
}

async function wipeEverything() {
  const sb = getServiceClient();
  // PostgREST refuses unfiltered DELETEs, so we filter on a column that's
  // never null. Each table needs its own column to avoid type-coercion
  // errors (e.g. "__never__" against a uuid column).
  const targets: Array<{ table: string; nonNullCol: string }> = [
    { table: "predictions", nonNullCol: "match_id" },
    { table: "comments", nonNullCol: "id" },
    { table: "specials", nonNullCol: "id" },
    { table: "allocations", nonNullCol: "id" },
    { table: "participants", nonNullCol: "id" },
  ];
  for (const { table, nonNullCol } of targets) {
    const { error } = await sb
      .from(table)
      .delete()
      .not(nonNullCol, "is", null);
    if (error) {
      console.warn(`reset: ${table}: ${error.message}`);
    }
  }
  for (const key of ["openfootball:cache", "specials:processed-cursor"]) {
    await sb.from("kv_store").delete().eq("key", key);
  }
}

export async function demoStatus(): Promise<{
  participants: number;
  matchesPlayed: number;
  totalMatches: number;
  specialsClaimed: number;
}> {
  const [people, cache, specials] = await Promise.all([
    getParticipants(),
    getOpenfootballCache(),
    getSpecials(),
  ]);
  return {
    participants: people.length,
    matchesPlayed: cache
      ? cache.matches.filter((m) => m.status !== "scheduled").length
      : 0,
    totalMatches: cache?.matches.length ?? 0,
    specialsClaimed: specials.filter((s) => s.status === "claimed").length,
  };
}
