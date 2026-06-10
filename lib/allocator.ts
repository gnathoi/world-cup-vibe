// Deterministic team allocator.
//
// Contract:
//   allocate(participants, teams, seed) -> Map<participant, team[]>
//   Same seed + same inputs (length and ordering ignored — we sort) always
//   produces the same output map. Reproducibility is non-negotiable: the
//   ceremony page replays from the persisted seed.
//
// Rules:
//   1. Each participant receives floor(48/n) teams.
//   2. The remaining (48 mod n) teams are distributed to a randomly chosen
//      subset of participants (one extra team each).
//   3. Pure random — no host-nation guard. USA / CAN / MEX can land anywhere,
//      including all on the same participant.
//   4. If n > teams, throw — there is not enough to go around.

import seedrandom from "seedrandom";
import type { Participant } from "./types";

export type Team = {
  code: string; // FIFA 3-letter, e.g. "BRA"
  name: string;
};

export type AllocationResult = {
  byParticipantId: Record<string, string[]>; // participant.id -> team codes
};

export class AllocatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AllocatorError";
  }
}

export function allocate(
  participants: Participant[],
  teams: Team[],
  seed: string,
): AllocationResult {
  if (participants.length === 0) {
    throw new AllocatorError("Cannot allocate with zero participants.");
  }
  if (participants.length > teams.length) {
    throw new AllocatorError(
      `More participants (${participants.length}) than teams (${teams.length}). Cannot guarantee one team each.`,
    );
  }

  // Sort by id so input order does not affect output. Reproducibility.
  const ps = [...participants].sort((a, b) => a.id.localeCompare(b.id));
  const ts = [...teams].sort((a, b) => a.code.localeCompare(b.code));

  const rng = seedrandom(seed);
  const shuffledTeams = shuffle(ts, rng);

  const result: Record<string, string[]> = {};
  for (const p of ps) result[p.id] = [];

  // Compute per-participant quotas so no one gets more than base+1 teams.
  const base = Math.floor(ts.length / ps.length);
  const extras = ts.length % ps.length;
  const extraSet = new Set(shuffle([...ps], rng).slice(0, extras).map((p) => p.id));
  const quotas = new Map(ps.map((p) => [p.id, extraSet.has(p.id) ? base + 1 : base]));

  // Pure random fill from the shuffled team pool — no host-nation guard.
  let qi = 0;
  for (const p of ps) {
    const slots = quotas.get(p.id)!;
    for (let i = 0; i < slots; i++) result[p.id].push(shuffledTeams[qi++].code);
  }

  // Sort each participant's teams alphabetically for stable display.
  for (const id of Object.keys(result)) {
    result[id].sort();
  }

  return { byParticipantId: result };
}

// Fisher-Yates shuffle, seeded.
function shuffle<T>(arr: T[], rng: seedrandom.PRNG): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Helper: deterministic random assignment of an array of items to participants.
// Used by the specials owner allocator for specials with no team link.
export function assignByRandom<T>(
  items: T[],
  participants: Participant[],
  seed: string,
): Array<{ item: T; participantId: string }> {
  if (participants.length === 0) return [];
  const ps = [...participants].sort((a, b) => a.id.localeCompare(b.id));
  const rng = seedrandom(seed);
  return items.map((item) => ({
    item,
    participantId: ps[Math.floor(rng() * ps.length)].id,
  }));
}
