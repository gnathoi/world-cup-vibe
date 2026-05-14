// Storage shim: dev writes/reads data/sweep.json, prod uses Vercel KV (Upstash).
// Every other file in the app imports from here; no one touches @vercel/kv or the
// JSON file directly. Storage swaps via STORAGE_DRIVER env var (default: "json"
// in development, "kv" in production).

import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Allocation,
  AllocationRecord,
  Comment,
  Participant,
  Prediction,
  Special,
  SweepData,
  Match,
} from "./types";

// ----- Driver selection ---------------------------------------------------

type Driver = "json" | "kv";

function resolveDriver(): Driver {
  const explicit = process.env.STORAGE_DRIVER as Driver | undefined;
  if (explicit === "json" || explicit === "kv") return explicit;
  return process.env.NODE_ENV === "production" ? "kv" : "json";
}

// ----- JSON driver --------------------------------------------------------

const JSON_PATH = path.join(process.cwd(), "data", "sweep.json");

async function readJsonStore(): Promise<SweepData> {
  try {
    const raw = await fs.readFile(JSON_PATH, "utf8");
    return JSON.parse(raw) as SweepData;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const empty: SweepData = {
        participants: [],
        allocation: null,
        comments: [],
        predictions: [],
        specials: [],
        potPaidBy: [],
        openfootballCache: null,
        specialCursor: null,
      };
      await writeJsonStore(empty);
      return empty;
    }
    throw err;
  }
}

async function writeJsonStore(data: SweepData): Promise<void> {
  await fs.mkdir(path.dirname(JSON_PATH), { recursive: true });
  await fs.writeFile(JSON_PATH, JSON.stringify(data, null, 2), "utf8");
}

// In-process mutex so concurrent server actions in dev don't race the JSON file.
let writeChain: Promise<void> = Promise.resolve();
function withJsonMutex<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeChain.then(fn);
  writeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

// ----- KV driver (Upstash via @vercel/kv) ---------------------------------
// Loaded lazily so dev runs without KV envs configured.

type KvClient = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<unknown>;
  del(key: string): Promise<unknown>;
  lpush(key: string, ...values: unknown[]): Promise<unknown>;
  lrange<T>(key: string, start: number, end: number): Promise<T[]>;
};

let kvClient: KvClient | null = null;
async function getKv(): Promise<KvClient> {
  if (!kvClient) {
    const mod = await import("@vercel/kv");
    kvClient = mod.kv as unknown as KvClient;
  }
  return kvClient;
}

// ----- Public API ---------------------------------------------------------
// The contract is the same regardless of driver. Each method is implemented
// for both drivers; the JSON driver reads/writes the single SweepData file,
// the KV driver uses discrete keys.

import { KV } from "./kv-keys";

const driver = resolveDriver();

export async function getParticipants(): Promise<Participant[]> {
  if (driver === "json") {
    const store = await readJsonStore();
    return store.participants;
  }
  const kv = await getKv();
  return (await kv.get<Participant[]>(KV.PARTICIPANTS)) ?? [];
}

export async function getParticipantByEmail(
  email: string,
): Promise<Participant | null> {
  if (driver === "json") {
    const store = await readJsonStore();
    return (
      store.participants.find(
        (p) => p.email.toLowerCase() === email.toLowerCase(),
      ) ?? null
    );
  }
  const kv = await getKv();
  return await kv.get<Participant>(KV.PARTICIPANT_BY_EMAIL(email));
}

export async function getParticipantById(id: string): Promise<Participant | null> {
  if (driver === "json") {
    const store = await readJsonStore();
    return store.participants.find((p) => p.id === id) ?? null;
  }
  const kv = await getKv();
  return await kv.get<Participant>(KV.PARTICIPANT_BY_ID(id));
}

export async function addParticipant(p: Participant): Promise<void> {
  if (driver === "json") {
    await withJsonMutex(async () => {
      const store = await readJsonStore();
      store.participants.push(p);
      await writeJsonStore(store);
    });
    return;
  }
  const kv = await getKv();
  const list = (await kv.get<Participant[]>(KV.PARTICIPANTS)) ?? [];
  list.push(p);
  await kv.set(KV.PARTICIPANTS, list);
  await kv.set(KV.PARTICIPANT_BY_ID(p.id), p);
  await kv.set(KV.PARTICIPANT_BY_EMAIL(p.email), p);
}

export async function getAllocation(): Promise<AllocationRecord | null> {
  if (driver === "json") {
    const store = await readJsonStore();
    return store.allocation;
  }
  const kv = await getKv();
  const seed = await kv.get<string>(KV.ALLOCATION_SEED);
  if (!seed) return null;
  const allocatedAt = (await kv.get<string>(KV.ALLOCATION_AT)) ?? "";
  const byParticipant =
    (await kv.get<Allocation[]>(KV.ALLOCATIONS)) ?? [];
  return { seed, allocatedAt, byParticipant };
}

export async function setAllocation(record: AllocationRecord): Promise<void> {
  if (driver === "json") {
    await withJsonMutex(async () => {
      const store = await readJsonStore();
      store.allocation = record;
      await writeJsonStore(store);
    });
    return;
  }
  const kv = await getKv();
  await kv.set(KV.ALLOCATION_SEED, record.seed);
  await kv.set(KV.ALLOCATION_AT, record.allocatedAt);
  await kv.set(KV.ALLOCATIONS, record.byParticipant);
}

export async function getComments(matchId: string | null): Promise<Comment[]> {
  if (driver === "json") {
    const store = await readJsonStore();
    return store.comments.filter((c) => c.matchId === matchId);
  }
  const kv = await getKv();
  const key =
    matchId === null ? KV.COMMENTS_GLOBAL : KV.COMMENTS_MATCH(matchId);
  const list = await kv.lrange<Comment>(key, 0, -1);
  return list.reverse(); // LPUSH stores newest-first; we want chronological
}

export async function appendComment(c: Comment): Promise<void> {
  if (driver === "json") {
    await withJsonMutex(async () => {
      const store = await readJsonStore();
      store.comments.push(c);
      await writeJsonStore(store);
    });
    return;
  }
  const kv = await getKv();
  const key =
    c.matchId === null ? KV.COMMENTS_GLOBAL : KV.COMMENTS_MATCH(c.matchId);
  await kv.lpush(key, c);
}

export async function getPredictionsByParticipant(
  participantId: string,
): Promise<Prediction[]> {
  if (driver === "json") {
    const store = await readJsonStore();
    return store.predictions.filter((p) => p.participantId === participantId);
  }
  const kv = await getKv();
  return (
    (await kv.get<Prediction[]>(
      KV.PREDICTIONS_BY_PARTICIPANT(participantId),
    )) ?? []
  );
}

export async function upsertPrediction(p: Prediction): Promise<void> {
  if (driver === "json") {
    await withJsonMutex(async () => {
      const store = await readJsonStore();
      const idx = store.predictions.findIndex(
        (x) =>
          x.matchId === p.matchId && x.participantId === p.participantId,
      );
      if (idx >= 0) store.predictions[idx] = p;
      else store.predictions.push(p);
      await writeJsonStore(store);
    });
    return;
  }
  const kv = await getKv();
  const list =
    (await kv.get<Prediction[]>(
      KV.PREDICTIONS_BY_PARTICIPANT(p.participantId),
    )) ?? [];
  const idx = list.findIndex((x) => x.matchId === p.matchId);
  if (idx >= 0) list[idx] = p;
  else list.push(p);
  await kv.set(KV.PREDICTIONS_BY_PARTICIPANT(p.participantId), list);
}

export async function getSpecials(): Promise<Special[]> {
  if (driver === "json") {
    const store = await readJsonStore();
    return store.specials;
  }
  const kv = await getKv();
  return (await kv.get<Special[]>(KV.SPECIALS_LIST)) ?? [];
}

export async function setSpecials(specials: Special[]): Promise<void> {
  if (driver === "json") {
    await withJsonMutex(async () => {
      const store = await readJsonStore();
      store.specials = specials;
      await writeJsonStore(store);
    });
    return;
  }
  const kv = await getKv();
  await kv.set(KV.SPECIALS_LIST, specials);
}

export async function getSpecialCursor(): Promise<string | null> {
  if (driver === "json") {
    const store = await readJsonStore();
    return store.specialCursor;
  }
  const kv = await getKv();
  return await kv.get<string>(KV.SPECIAL_CURSOR);
}

export async function setSpecialCursor(cursor: string): Promise<void> {
  if (driver === "json") {
    await withJsonMutex(async () => {
      const store = await readJsonStore();
      store.specialCursor = cursor;
      await writeJsonStore(store);
    });
    return;
  }
  const kv = await getKv();
  await kv.set(KV.SPECIAL_CURSOR, cursor);
}

export async function getOpenfootballCache(): Promise<{
  matches: Match[];
  fetchedAt: string;
} | null> {
  if (driver === "json") {
    const store = await readJsonStore();
    return store.openfootballCache;
  }
  const kv = await getKv();
  return await kv.get(KV.OPENFOOTBALL_CACHE);
}

export async function setOpenfootballCache(payload: {
  matches: Match[];
  fetchedAt: string;
}): Promise<void> {
  if (driver === "json") {
    await withJsonMutex(async () => {
      const store = await readJsonStore();
      store.openfootballCache = payload;
      await writeJsonStore(store);
    });
    return;
  }
  const kv = await getKv();
  await kv.set(KV.OPENFOOTBALL_CACHE, payload);
}

export async function getPotPaidBy(): Promise<string[]> {
  if (driver === "json") {
    const store = await readJsonStore();
    return store.potPaidBy;
  }
  const kv = await getKv();
  return (await kv.get<string[]>(KV.POT_PAID)) ?? [];
}

export async function setPotPaidBy(participantIds: string[]): Promise<void> {
  if (driver === "json") {
    await withJsonMutex(async () => {
      const store = await readJsonStore();
      store.potPaidBy = participantIds;
      await writeJsonStore(store);
    });
    return;
  }
  const kv = await getKv();
  await kv.set(KV.POT_PAID, participantIds);
}

// Useful only in tests / local resets
export async function _resetStoreForTests(): Promise<void> {
  if (driver !== "json") {
    throw new Error("_resetStoreForTests is only valid with the JSON driver");
  }
  const empty: SweepData = {
    participants: [],
    allocation: null,
    comments: [],
    predictions: [],
    specials: [],
    potPaidBy: [],
    openfootballCache: null,
    specialCursor: null,
  };
  await writeJsonStore(empty);
}
