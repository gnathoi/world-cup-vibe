import { randomUUID } from "node:crypto";
import {
  setAllocation,
  getParticipants,
  getSpecials,
  setSpecials,
} from "./db";
import { allocate } from "./allocator";
import { TEAMS_2026 } from "./teams";
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
  const { byParticipantId } = allocate(participants, TEAMS_2026, drawSeed);

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

  // Team-linked specials (e.g. team_advances_to_round) get assigned to the
  // owner of that specific team. All others remain ownerless until the event
  // happens — whoever's team triggers it wins the bet at that point.
  const teamOwner = new Map<string, string>();
  for (const [pid, codes] of Object.entries(byParticipantId)) {
    for (const code of codes) teamOwner.set(code, pid);
  }

  const seeded: Special[] = specials.map((s) => {
    const teamRef = specialReferencesTeam(s);
    if (teamRef && teamOwner.has(teamRef)) {
      return { ...s, ownerParticipantId: teamOwner.get(teamRef)! };
    }
    return { ...s, ownerParticipantId: null };
  });

  await setSpecials(seeded);
}
