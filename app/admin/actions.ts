"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import {
  getAllocation,
  setAllocation,
  getParticipants,
  getPotPaidBy,
  setPotPaidBy,
  getSpecials,
  setSpecials,
} from "@/lib/db";
import { allocate, assignByRandom } from "@/lib/allocator";
import { TEAMS_2026, HOST_NATIONS } from "@/lib/teams";
import { DEFAULT_SPECIALS, specialReferencesTeam } from "@/lib/specials/defaults";
import type { Special } from "@/lib/types";

const ADMIN_COOKIE = "goal-1966-admin";

async function requireAdmin() {
  const store = await cookies();
  if (store.get(ADMIN_COOKIE)?.value !== "ok") {
    throw new Error("Not authorised.");
  }
}

export async function reallocateAction(formData: FormData) {
  await requireAdmin();
  const participants = await getParticipants().then((ps) =>
    ps.filter((p) => !p.spectator),
  );
  if (participants.length === 0) {
    throw new Error("No participants signed up — nothing to allocate.");
  }
  const submitted = String(formData.get("seed") ?? "").trim();
  const seed = submitted || randomUUID();
  const { byParticipantId } = allocate(participants, TEAMS_2026, seed, HOST_NATIONS);

  await setAllocation({
    seed,
    allocatedAt: new Date().toISOString(),
    byParticipant: Object.entries(byParticipantId).map(
      ([participantId, teamCodes]) => ({ participantId, teamCodes }),
    ),
  });

  // Ensure specials exist, then assign owners.
  let specials = await getSpecials();
  if (specials.length === 0) {
    specials = DEFAULT_SPECIALS.map((s) => ({
      ...s,
      ownerParticipantId: null,
      status: "pending" as const,
    }));
  }

  // Team-linked specials -> owner is the team's holder.
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

  // Orphan specials (no team link) -> seeded random assignment.
  const random = assignByRandom(orphanSpecials, participants, seed + ":specials");
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
  await requireAdmin();
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
