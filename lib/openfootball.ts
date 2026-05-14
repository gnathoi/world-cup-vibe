// openfootball adapter: fetch + parse with Zod + cache + stale fallback.
// The whole rest of the app reads via getMatches() — never the raw URL.

import { z } from "zod";
import { getOpenfootballCache, setOpenfootballCache } from "./db";
import type { CardEvent, GoalEvent, Match } from "./types";

// ----- Raw schema (snapshot of the openfootball worldcup.json shape) -----

const RawScoreSchema = z.object({
  ft: z.tuple([z.number(), z.number()]).optional(),
  ht: z.tuple([z.number(), z.number()]).optional(),
});

const RawTeamSchema = z.object({
  key: z.string().optional(),
  code: z.string(),
  name: z.string(),
});

const RawGoalSchema = z.object({
  name: z.string(),
  minute: z.number(),
  score: z.tuple([z.number(), z.number()]).optional(),
  owngoal: z.boolean().optional(),
  penalty: z.boolean().optional(),
});

const RawCardSchema = z.object({
  name: z.string(),
  minute: z.number(),
  type: z.enum(["yellow", "red", "yellow_red"]).optional(),
});

const RawMatchSchema = z.object({
  num: z.number().optional(),
  round: z.string().optional(),
  date: z.string(),
  time: z.string().optional(),
  team1: RawTeamSchema,
  team2: RawTeamSchema,
  score: RawScoreSchema.optional(),
  group: z.string().optional(),
  goals1: z.array(RawGoalSchema).optional(),
  goals2: z.array(RawGoalSchema).optional(),
  cards1: z.array(RawCardSchema).optional(),
  cards2: z.array(RawCardSchema).optional(),
  status: z.string().optional(),
});

const RawRootSchema = z.object({
  name: z.string().optional(),
  matches: z.array(RawMatchSchema),
});

// ----- Adapter -----------------------------------------------------------

function normalizeRound(raw: string | undefined): Match["round"] {
  if (!raw) return "group";
  const r = raw.toLowerCase();
  if (r.includes("final") && !r.includes("semi") && !r.includes("third"))
    return "final";
  if (r.includes("third")) return "third_place";
  if (r.includes("semi")) return "semi";
  if (r.includes("quarter")) return "quarter";
  if (r.includes("round of 16") || r.includes("r16")) return "round_of_16";
  if (r.includes("round of 32") || r.includes("r32")) return "round_of_32";
  return "group";
}

function matchStatusFromScore(
  score: z.infer<typeof RawScoreSchema> | undefined,
): Match["status"] {
  if (!score?.ft) return "scheduled";
  return "ft";
}

function buildMatchId(date: string, home: string, away: string): string {
  return `${date}-${home}-${away}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

export function normalizeRaw(rawJson: unknown): Match[] {
  const root = RawRootSchema.parse(rawJson);
  const matches: Match[] = [];

  for (let i = 0; i < root.matches.length; i++) {
    const m = root.matches[i];
    const home = m.team1;
    const away = m.team2;
    const id = buildMatchId(m.date, home.code, away.code);
    const kickoffUtc = m.time
      ? new Date(`${m.date}T${m.time}:00Z`).toISOString()
      : new Date(`${m.date}T00:00:00Z`).toISOString();

    const goals: GoalEvent[] = [];
    for (const g of m.goals1 ?? []) {
      goals.push({
        matchId: id,
        minute: g.minute,
        scorerName: g.name,
        teamCode: home.code,
        isOwnGoal: g.owngoal,
        isPenalty: g.penalty,
      });
    }
    for (const g of m.goals2 ?? []) {
      goals.push({
        matchId: id,
        minute: g.minute,
        scorerName: g.name,
        teamCode: away.code,
        isOwnGoal: g.owngoal,
        isPenalty: g.penalty,
      });
    }

    const cards: CardEvent[] = [];
    for (const c of m.cards1 ?? []) {
      cards.push({
        matchId: id,
        minute: c.minute,
        playerName: c.name,
        teamCode: home.code,
        cardType: c.type === "red" || c.type === "yellow_red" ? "red" : "yellow",
      });
    }
    for (const c of m.cards2 ?? []) {
      cards.push({
        matchId: id,
        minute: c.minute,
        playerName: c.name,
        teamCode: away.code,
        cardType: c.type === "red" || c.type === "yellow_red" ? "red" : "yellow",
      });
    }

    matches.push({
      id,
      matchDay: m.num ?? i + 1,
      date: m.date,
      kickoffUtc,
      group: m.group,
      round: normalizeRound(m.round),
      home: { code: home.code, name: home.name },
      away: { code: away.code, name: away.name },
      status: matchStatusFromScore(m.score),
      score: m.score?.ft
        ? {
            home: m.score.ft[0],
            away: m.score.ft[1],
            ht: m.score.ht
              ? { home: m.score.ht[0], away: m.score.ht[1] }
              : undefined,
          }
        : undefined,
      goals,
      cards,
    });
  }

  // Sort by kickoff for deterministic downstream consumption.
  matches.sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  return matches;
}

// ----- Fetch + cache -----------------------------------------------------

export type FetchResult =
  | { fresh: true; matches: Match[]; fetchedAt: string }
  | { fresh: false; matches: Match[]; fetchedAt: string; reason: string };

const DEFAULT_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

export async function refreshFromOpenfootball(
  urlOverride?: string,
): Promise<FetchResult> {
  const url = urlOverride ?? process.env.OPENFOOTBALL_URL ?? DEFAULT_URL;
  const fetchedAt = new Date().toISOString();
  let raw: unknown;

  try {
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) {
      const cache = await getOpenfootballCache();
      if (cache) {
        return {
          fresh: false,
          matches: cache.matches,
          fetchedAt: cache.fetchedAt,
          reason: `upstream returned ${resp.status}`,
        };
      }
      throw new Error(`openfootball fetch failed: ${resp.status}`);
    }
    raw = await resp.json();
  } catch (err) {
    const cache = await getOpenfootballCache();
    if (cache) {
      return {
        fresh: false,
        matches: cache.matches,
        fetchedAt: cache.fetchedAt,
        reason: (err as Error).message,
      };
    }
    throw err;
  }

  const matches = normalizeRaw(raw);
  await setOpenfootballCache({ matches, fetchedAt });
  return { fresh: true, matches, fetchedAt };
}

export async function getMatches(): Promise<Match[]> {
  const cache = await getOpenfootballCache();
  return cache?.matches ?? [];
}

// Useful for components that want a "data may be stale" stamp.
export async function getCacheAge(): Promise<{
  fetchedAt: string | null;
  ageMs: number | null;
}> {
  const cache = await getOpenfootballCache();
  if (!cache) return { fetchedAt: null, ageMs: null };
  return {
    fetchedAt: cache.fetchedAt,
    ageMs: Date.now() - new Date(cache.fetchedAt).getTime(),
  };
}
