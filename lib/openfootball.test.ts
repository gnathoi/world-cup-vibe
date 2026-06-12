import { describe, it, expect } from "vitest";
import { normalizeRaw } from "./openfootball";

// openfootball switched `minute` from a number to a string (to carry stoppage
// time like "45+2"). normalizeRaw must accept both forms and coerce to an
// integer, otherwise the whole refresh throws a ZodError. Regression guard.
describe("normalizeRaw minute coercion", () => {
  const base = {
    matches: [
      {
        date: "2026-06-11",
        time: "13:00 UTC-6",
        team1: "Mexico",
        team2: "South Africa",
        score: { ft: [2, 0], ht: [1, 0] },
      },
    ],
  };

  it("accepts string minutes (current openfootball shape)", () => {
    const raw = structuredClone(base);
    (raw.matches[0] as Record<string, unknown>).goals1 = [
      { name: "Julián Quiñones", minute: "9" },
      { name: "Raúl Jiménez", minute: "67" },
    ];
    (raw.matches[0] as Record<string, unknown>).cards1 = [
      { name: "Some Player", minute: "82", type: "red" },
    ];
    const matches = normalizeRaw(raw);
    expect(matches[0].goals.map((g) => g.minute)).toEqual([9, 67]);
    expect(matches[0].cards[0].minute).toBe(82);
    expect(matches[0].cards[0].cardType).toBe("red");
  });

  it("parses stoppage-time notation to base + added minutes", () => {
    const raw = structuredClone(base);
    (raw.matches[0] as Record<string, unknown>).goals1 = [
      { name: "Late Winner", minute: "45+2" },
      { name: "Injury Time", minute: "90 +5" },
    ];
    const matches = normalizeRaw(raw);
    expect(matches[0].goals.map((g) => g.minute)).toEqual([47, 95]);
  });

  it("still accepts numeric minutes (legacy shape)", () => {
    const raw = structuredClone(base);
    (raw.matches[0] as Record<string, unknown>).goals1 = [
      { name: "Old Format", minute: 23 },
    ];
    const matches = normalizeRaw(raw);
    expect(matches[0].goals[0].minute).toBe(23);
  });
});
