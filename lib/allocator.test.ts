import { describe, it, expect } from "vitest";
import { allocate, AllocatorError, type Team } from "./allocator";
import type { Participant } from "./types";

const PARTICIPANTS_3: Participant[] = [
  {
    id: "a",
    email: "a@ex.com",
    displayName: "A",
    signedUpAt: "2026-06-01T00:00:00Z",
    spectator: false,
    paidIn: true,
  },
  {
    id: "b",
    email: "b@ex.com",
    displayName: "B",
    signedUpAt: "2026-06-01T00:01:00Z",
    spectator: false,
    paidIn: true,
  },
  {
    id: "c",
    email: "c@ex.com",
    displayName: "C",
    signedUpAt: "2026-06-01T00:02:00Z",
    spectator: false,
    paidIn: true,
  },
];

function teams(...codes: string[]): Team[] {
  return codes.map((c) => ({ code: c, name: c }));
}

function teamsRange(prefix: string, n: number): Team[] {
  return Array.from({ length: n }, (_, i) => ({
    code: `${prefix}${String(i).padStart(2, "0")}`,
    name: `Team ${i}`,
  }));
}

describe("allocate — determinism", () => {
  it("produces the same allocation map for the same seed and inputs", () => {
    const ts = teamsRange("T", 48);
    const a = allocate(PARTICIPANTS_3, ts, "seed-1");
    const b = allocate(PARTICIPANTS_3, ts, "seed-1");
    expect(a).toEqual(b);
  });

  it("produces a different map for a different seed", () => {
    const ts = teamsRange("T", 48);
    const a = allocate(PARTICIPANTS_3, ts, "seed-1");
    const b = allocate(PARTICIPANTS_3, ts, "seed-2");
    expect(a).not.toEqual(b);
  });

  it("is unaffected by input ordering of participants/teams", () => {
    const ts = teamsRange("T", 48);
    const reversedTeams = [...ts].reverse();
    const reversedParticipants = [...PARTICIPANTS_3].reverse();
    const base = allocate(PARTICIPANTS_3, ts, "stable-seed");
    const reordered = allocate(
      reversedParticipants,
      reversedTeams,
      "stable-seed",
    );
    expect(reordered).toEqual(base);
  });
});

describe("allocate — distribution", () => {
  it("gives each participant floor(48/n) teams plus the remainder to a subset", () => {
    const ts = teamsRange("T", 48);
    const result = allocate(PARTICIPANTS_3, ts, "any-seed");
    const sizes = Object.values(result.byParticipantId).map((arr) => arr.length);
    // 48 / 3 = 16 exactly, no remainder, so all equal
    expect(sizes).toEqual([16, 16, 16]);
    // every team allocated once
    const all = Object.values(result.byParticipantId).flat();
    expect(new Set(all).size).toBe(48);
  });

  it("handles uneven distribution: 16 teams across 3 people = sizes 5/5/6 or 5/6/5 etc", () => {
    const ts = teamsRange("T", 16);
    const result = allocate(PARTICIPANTS_3, ts, "any-seed");
    const sizes = Object.values(result.byParticipantId)
      .map((a) => a.length)
      .sort();
    expect(sizes).toEqual([5, 5, 6]);
  });

  it("n=1: single participant gets all teams", () => {
    const single: Participant[] = [PARTICIPANTS_3[0]];
    const result = allocate(single, teamsRange("T", 48), "seed-single");
    expect(result.byParticipantId["a"]).toHaveLength(48);
  });

  it("n==teams: every participant gets exactly one", () => {
    const ts = teamsRange("T", 3);
    const result = allocate(PARTICIPANTS_3, ts, "exact");
    for (const arr of Object.values(result.byParticipantId)) {
      expect(arr).toHaveLength(1);
    }
  });

  it("n > teams: throws AllocatorError", () => {
    const ts = teamsRange("T", 2);
    expect(() => allocate(PARTICIPANTS_3, ts, "too-many")).toThrowError(
      AllocatorError,
    );
  });

  it("zero participants: throws AllocatorError", () => {
    expect(() => allocate([], teamsRange("T", 48), "no-one")).toThrowError(
      AllocatorError,
    );
  });
});

describe("allocate — pure random (no host-nation guard)", () => {
  it("every team is allocated exactly once, hosts included", () => {
    const ts = teams("USA", "CAN", "MEX", ...teamsRange("T", 45).map((t) => t.code));
    const result = allocate(PARTICIPANTS_3, ts, "pure-random");
    const allCodes = Object.values(result.byParticipantId).flat();
    expect(allCodes).toHaveLength(48);
    expect(new Set(allCodes).size).toBe(48); // no dupes, none dropped
  });

  it("host nations may pile up on one participant", () => {
    // Find a seed where all three hosts land on the same participant — proves
    // the guard is gone. With pure randomness this is reachable.
    const ts = teams("USA", "CAN", "MEX", ...teamsRange("T", 45).map((t) => t.code));
    let piledUp = false;
    for (let i = 0; i < 200 && !piledUp; i++) {
      const result = allocate(PARTICIPANTS_3, ts, `seed-${i}`);
      piledUp = Object.values(result.byParticipantId).some(
        (codes) =>
          codes.filter((c) => ["USA", "CAN", "MEX"].includes(c)).length >= 2,
      );
    }
    expect(piledUp).toBe(true);
  });
});
