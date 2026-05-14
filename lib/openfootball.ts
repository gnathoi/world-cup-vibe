// openfootball adapter: fetch + parse with Zod + cache + stale fallback.
// The whole rest of the app reads via getMatches() — never the raw URL.
//
// The real openfootball worldcup.json shape (verified against the live URL):
//   - team1, team2: country NAME strings (e.g. "Mexico")
//   - time: "HH:MM UTC±X" (e.g. "19:30 UTC-4")
//   - round: free-text ("Matchday 1", "Round of 16", "Quarter-final", "Final")
//   - score is optional and absent pre-tournament
//   - goals1/goals2/cards1/cards2 may not appear at all pre-tournament

import { z } from "zod";
import { getOpenfootballCache, setOpenfootballCache } from "./db";
import { TEAMS_2026 } from "./teams";
import type { CardEvent, GoalEvent, Match } from "./types";

// ----- Raw schema (snapshot of the openfootball worldcup.json shape) -----

const RawScoreSchema = z.object({
  ft: z.tuple([z.number(), z.number()]).optional(),
  ht: z.tuple([z.number(), z.number()]).optional(),
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
  team1: z.string(),
  team2: z.string(),
  score: RawScoreSchema.optional(),
  group: z.string().optional(),
  ground: z.string().optional(),
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

// ----- Helpers -----------------------------------------------------------

function normalizeRound(raw: string | undefined): Match["round"] {
  if (!raw) return "group";
  const r = raw.toLowerCase();
  // Order matters here: check the more-specific labels first because
  // "Quarter-final" / "Semi-final" / "third place" all contain the word "final".
  if (r.includes("third")) return "third_place";
  if (r.includes("semi")) return "semi";
  if (r.includes("quarter")) return "quarter";
  if (r.includes("round of 16") || r.includes("r16")) return "round_of_16";
  if (r.includes("round of 32") || r.includes("r32")) return "round_of_32";
  if (r === "final" || r.endsWith(" final") || r.startsWith("final"))
    return "final";
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

// Country name -> { code, name } lookup. TEAMS_2026 is built case-insensitively.
const NAME_TO_TEAM = new Map<string, { code: string; name: string }>();
for (const t of TEAMS_2026) {
  NAME_TO_TEAM.set(t.name.toLowerCase(), { code: t.code, name: t.name });
}
// Common openfootball spellings that differ from FIFA conventions.
const NAME_ALIASES: Record<string, string> = {
  türkiye: "Türkiye",
  turkiye: "Türkiye",
  turkey: "Türkiye",
  "south korea": "South Korea",
  "korea republic": "South Korea",
  iran: "Iran",
  "ivory coast": "Ivory Coast",
  "cote d'ivoire": "Ivory Coast",
  "côte d'ivoire": "Ivory Coast",
  usa: "United States",
  "united states": "United States",
};

function resolveTeam(name: string): { code: string; name: string } {
  const lower = name.toLowerCase().trim();
  const canonical = NAME_ALIASES[lower] ?? name;
  const hit = NAME_TO_TEAM.get(canonical.toLowerCase());
  if (hit) return hit;
  // Fallback: synthesize a 3-letter code from the alphabetic chars of the name.
  // This covers placeholder names like "Winner of Group A" or qualifiers not
  // in the static table yet, without throwing.
  const synth = name
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 3);
  return { code: synth || "TBD", name };
}

// Parse "HH:MM UTC±X" or just "HH:MM" against a date string into a true UTC ISO.
function parseKickoffUtc(date: string, time: string | undefined): string {
  if (!time) {
    return new Date(`${date}T00:00:00Z`).toISOString();
  }
  const m = time.match(/^(\d{1,2}):(\d{2})(?:\s+UTC([+-]\d{1,2}))?/);
  if (!m) return new Date(`${date}T00:00:00Z`).toISOString();
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const offset = m[3] ? parseInt(m[3], 10) : 0;
  // local_time + (-offset) = UTC. e.g. "19:30 UTC-4" -> 23:30 UTC.
  const [Y, M, D] = date.split("-").map(Number);
  const ms = Date.UTC(Y, M - 1, D, hh - offset, mm, 0);
  return new Date(ms).toISOString();
}

// ----- Adapter -----------------------------------------------------------

export function normalizeRaw(rawJson: unknown): Match[] {
  const root = RawRootSchema.parse(rawJson);
  const matches: Match[] = [];

  for (let i = 0; i < root.matches.length; i++) {
    const m = root.matches[i];
    const home = resolveTeam(m.team1);
    const away = resolveTeam(m.team2);
    const id = buildMatchId(m.date, home.code, away.code);
    const kickoffUtc = parseKickoffUtc(m.date, m.time);

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
        cardType:
          c.type === "red" || c.type === "yellow_red" ? "red" : "yellow",
      });
    }
    for (const c of m.cards2 ?? []) {
      cards.push({
        matchId: id,
        minute: c.minute,
        playerName: c.name,
        teamCode: away.code,
        cardType:
          c.type === "red" || c.type === "yellow_red" ? "red" : "yellow",
      });
    }

    matches.push({
      id,
      matchDay: m.num ?? i + 1,
      date: m.date,
      kickoffUtc,
      group: m.group,
      round: normalizeRound(m.round),
      home,
      away,
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
