// Deterministic team allocator.
//
// Contract:
//   allocate(participants, teams, seed, hostNations) -> Map<participant, team[]>
//   Same seed + same inputs (length and ordering ignored — we sort) always
//   produces the same output map. Reproducibility is non-negotiable: the
//   ceremony page replays from the persisted seed.
//
// Rules:
//   1. Each participant receives floor(48/n) teams.
//   2. The remaining (48 mod n) teams are distributed to a randomly chosen
//      subset of participants (one extra team each).
//   3. Host-nation guard: USA / CAN / MEX are flagged. If n >= 3, no single
//      participant owns more than one of the three. If n < 3, all hosts go
//      to whoever — the constraint relaxes.
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

const DEFAULT_HOST_NATIONS = ["USA", "CAN", "MEX"];

export function allocate(
  participants: Participant[],
  teams: Team[],
  seed: string,
  hostNationCodes: string[] = DEFAULT_HOST_NATIONS,
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

  // Split teams into hosts and non-hosts. Apply guard only when n >= hosts.
  const hostsSet = new Set(hostNationCodes);
  const hosts = shuffledTeams.filter((t) => hostsSet.has(t.code));
  const nonHosts = shuffledTeams.filter((t) => !hostsSet.has(t.code));

  const result: Record<string, string[]> = {};
  for (const p of ps) result[p.id] = [];

  // Distribute hosts first when guard applies, one per participant.
  if (ps.length >= hosts.length) {
    const recipients = shuffle(ps, rng).slice(0, hosts.length);
    recipients.forEach((p, i) => {
      result[p.id].push(hosts[i].code);
    });
  } else {
    // n < hosts: relax guard, push all hosts into the pool.
    nonHosts.push(...hosts);
  }

  // Greedy round-robin over remaining teams, randomised start so
  // the same person doesn't always get a slight edge.
  const startIdx = Math.floor(rng() * ps.length);
  let cursor = startIdx;
  for (const team of shuffle(nonHosts, rng)) {
    result[ps[cursor].id].push(team.code);
    cursor = (cursor + 1) % ps.length;
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
