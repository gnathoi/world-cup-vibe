"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import {
  setAllocation,
  getParticipants,
  getPotPaidBy,
  setPotPaidBy,
  getSpecials,
  setSpecials,
} from "@/lib/db";
import { allocate, assignByRandom } from "@/lib/allocator";
import { TEAMS_2026, HOST_NATIONS } from "@/lib/teams";
import {
  DEFAULT_SPECIALS,
  specialReferencesTeam,
} from "@/lib/specials/defaults";
import { refreshFromOpenfootball } from "@/lib/openfootball";
import type { Special } from "@/lib/types";

// Admin is currently unauthenticated — friend-group toy. If/when this opens
// up beyond trusted users, gate every action below with a session check.

export async function reallocateAction(formData: FormData) {
  const participants = await getParticipants().then((ps) =>
    ps.filter((p) => !p.spectator),
  );
  if (participants.length === 0) {
    throw new Error("No participants signed up — nothing to allocate.");
  }
  const submitted = String(formData.get("seed") ?? "").trim();
  const seed = submitted || randomUUID();
  const { byParticipantId } = allocate(
    participants,
    TEAMS_2026,
    seed,
    HOST_NATIONS,
  );

  await setAllocation({
    seed,
    allocatedAt: new Date().toISOString(),
    byParticipant: Object.entries(byParticipantId).map(
      ([participantId, teamCodes]) => ({ participantId, teamCodes }),
    ),
  });

  let specials = await getSpecials();
  if (specials.length === 0) {
    specials = DEFAULT_SPECIALS.map((s) => ({
      ...s,
      ownerParticipantId: null,
      status: "pending" as const,
    }));
  }

  const teamOwner = new Map<string, string>();
  for (const [pid, codes] of Object.entries(byParticipantId)) {
    for (const code of codes) teamOwner.set(code, pid);
  }
  const specialsWithOwners: Special[] = [];
  const orphanSpecials: Special[] = [];
  for (const s of specials) {
    const teamRef = specialReferencesTeam(s);
    if (teamRef && teamOwner.has(teamRef)) {
      specialsWithOwners.push({
        ...s,
        ownerParticipantId: teamOwner.get(teamRef)!,
      });
    } else {
      orphanSpecials.push(s);
    }
  }

  const random = assignByRandom(
    orphanSpecials,
    participants,
    seed + ":specials",
  );
  for (const { item, participantId } of random) {
    specialsWithOwners.push({ ...item, ownerParticipantId: participantId });
  }

  await setSpecials(specialsWithOwners);

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/admin");
  revalidatePath("/ceremony");
}

export async function togglePaidAction(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  if (!participantId) throw new Error("Missing participantId");
  const current = await getPotPaidBy();
  const next = current.includes(participantId)
    ? current.filter((id) => id !== participantId)
    : [...current, participantId];
  await setPotPaidBy(next);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function refreshOpenfootballAction() {
  // Pulls fresh openfootball data, runs the specials evaluator, revalidates
  // every dependent page. Replaces the previous pg_cron + Vercel cron setup.
  const result = await refreshFromOpenfootball();

  // Re-evaluate specials on the new snapshot. Lazy-import to avoid pulling
  // the evaluator into pages that never use it.
  const { evaluate } = await import("@/lib/specials/evaluate");
  const { getSpecialCursor, setSpecialCursor } = await import("@/lib/db");
  const [specials, cursor] = await Promise.all([
    getSpecials(),
    getSpecialCursor(),
  ]);
  const { newClaims, updatedCursor } = evaluate(
    result.matches,
    specials,
    cursor,
  );
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
  if (updatedCursor && updatedCursor !== cursor) {
    await setSpecialCursor(updatedCursor);
  }

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/admin");
}
