// Shared allocation logic used by both the admin action and the auto-allocation
// cron. Keeps the draw reproducible and the two call-sites in sync.

import { randomUUID } from "node:crypto";
import {
  setAllocation,
  getParticipants,
  getSpecials,
  setSpecials,
} from "./db";
import { allocate, assignByRandom } from "./allocator";
import { TEAMS_2026, HOST_NATIONS } from "./teams";
import { DEFAULT_SPECIALS, specialReferencesTeam } from "./specials/defaults";
import type { Special } from "./types";

export async function performDraw(seed?: string): Promise<void> {
  const participants = await getParticipants().then((ps) =>
    ps.filter((p) => !p.spectator),
  );
  if (participants.length === 0) {
    throw new Error("No participants signed up — nothing to allocate.");
  }

  const drawSeed = seed?.trim() || randomUUID();
  const { byParticipantId } = allocate(
    participants,
    TEAMS_2026,
    drawSeed,
    HOST_NATIONS,
  );

  await setAllocation({
    seed: drawSeed,
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
    drawSeed + ":specials",
  );
  for (const { item, participantId } of random) {
    specialsWithOwners.push({ ...item, ownerParticipantId: participantId });
  }

  await setSpecials(specialsWithOwners);
}
