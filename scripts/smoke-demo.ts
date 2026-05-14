// Smoke test for the demo flow.
//
// Exercises the same data-layer calls that startDemoAction + tickDemoAction
// make, against the real Supabase project pointed at by .env.local. We
// bypass the Next.js server-action wrapper (cookies, revalidatePath) and
// just verify the underlying logic.
//
// Run: npx tsx scripts/smoke-demo.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import { getServiceClient } from "../lib/supabase";
import {
  addParticipant,
  getParticipants,
  setAllocation,
  setSpecials,
  getOpenfootballCache,
  getSpecials,
  setPotPaidBy,
  setOpenfootballCache,
  setSpecialCursor,
} from "../lib/db";
import { allocate, assignByRandom } from "../lib/allocator";
import { TEAMS_2026, HOST_NATIONS } from "../lib/teams";
import {
  DEFAULT_SPECIALS,
  specialReferencesTeam,
} from "../lib/specials/defaults";
import { refreshFromOpenfootball } from "../lib/openfootball";
import { evaluate } from "../lib/specials/evaluate";
import { simulateMatch, nextUnplayedMatch } from "../lib/demo/simulator";
import type { Participant, Special } from "../lib/types";

const DEMO_SEED = "smoke-test-2026";

async function wipeEverything() {
  const sb = getServiceClient();
  const targets = [
    { table: "predictions", col: "match_id" },
    { table: "comments", col: "id" },
    { table: "specials", col: "id" },
    { table: "allocations", col: "id" },
    { table: "participants", col: "id" },
  ];
  for (const { table, col } of targets) {
    const { error } = await sb.from(table).delete().not(col, "is", null);
    if (error) throw new Error(`wipe ${table}: ${error.message}`);
  }
  for (const key of ["openfootball:cache", "specials:processed-cursor"]) {
    const { error } = await sb.from("kv_store").delete().eq("key", key);
    if (error) throw new Error(`wipe kv ${key}: ${error.message}`);
  }
}

async function step(label: string, fn: () => Promise<unknown>) {
  process.stdout.write(`${label}... `);
  const t0 = Date.now();
  try {
    const out = await fn();
    console.log(`OK (${Date.now() - t0}ms)`);
    return out;
  } catch (e) {
    console.log(`FAIL`);
    console.error(e);
    process.exit(1);
  }
}

async function main() {
  console.log("=== smoke-demo against", process.env.SUPABASE_URL, "===\n");

  await step("1. wipe everything", wipeEverything);

  await step("2. add 4 demo participants", async () => {
    const people = [
      { name: "Lee Cattermole", email: "lee" },
      { name: "Sarah", email: "sarah" },
      { name: "Jordan", email: "jordan" },
      { name: "Maya", email: "maya" },
    ];
    for (const p of people) {
      await addParticipant({
        id: randomUUID(),
        email: `${p.email}@smoke.local`,
        displayName: p.name,
        signedUpAt: new Date().toISOString(),
        spectator: false,
        paidIn: true,
      });
    }
  });

  const participants = (await step("3. read back participants", () =>
    getParticipants(),
  )) as Participant[];
  console.log(`   got ${participants.length}: ${participants.map((p) => p.displayName).join(", ")}`);

  await step("4. allocate teams", async () => {
    const { byParticipantId } = allocate(
      participants,
      TEAMS_2026,
      DEMO_SEED,
      HOST_NATIONS,
    );
    await setAllocation({
      seed: DEMO_SEED,
      allocatedAt: new Date().toISOString(),
      byParticipant: Object.entries(byParticipantId).map(
        ([participantId, teamCodes]) => ({ participantId, teamCodes }),
      ),
    });
    // Mark them paid
    await setPotPaidBy(participants.map((p) => p.id));

    // Specials
    const specials = DEFAULT_SPECIALS.map<Special>((s) => ({
      ...s,
      ownerParticipantId: null,
      status: "pending",
    }));
    const teamOwner = new Map<string, string>();
    for (const [pid, codes] of Object.entries(byParticipantId)) {
      for (const code of codes) teamOwner.set(code, pid);
    }
    const withOwners: Special[] = [];
    const orphan: Special[] = [];
    for (const s of specials) {
      const ref = specialReferencesTeam(s);
      if (ref && teamOwner.has(ref)) {
        withOwners.push({ ...s, ownerParticipantId: teamOwner.get(ref)! });
      } else {
        orphan.push(s);
      }
    }
    for (const r of assignByRandom(orphan, participants, DEMO_SEED + ":specials")) {
      withOwners.push({ ...r.item, ownerParticipantId: r.participantId });
    }
    await setSpecials(withOwners);
  });

  await step("5. refresh openfootball cache", async () => {
    const r = await refreshFromOpenfootball();
    console.log(`   fresh=${r.fresh} matches=${r.matches.length}`);
  });

  // Tick a bunch of matches to make sure the simulator + cache update + evaluator all work.
  const TICKS = 20;
  let lastScore = "";
  let specialClaims = 0;
  for (let i = 0; i < TICKS; i++) {
    await step(`6.${i + 1} tick`, async () => {
      const cache = await getOpenfootballCache();
      if (!cache) throw new Error("no cache");
      const next = nextUnplayedMatch(cache.matches);
      if (!next) {
        console.log("   (no more unplayed)");
        return;
      }
      const { match: simulated } = simulateMatch(next, DEMO_SEED);
      const updated = cache.matches.map((m) =>
        m.id === simulated.id ? simulated : m,
      );
      await setOpenfootballCache({
        matches: updated,
        fetchedAt: new Date().toISOString(),
      });
      const specials = await getSpecials();
      const { newClaims, updatedCursor } = evaluate(updated, specials, null);
      if (newClaims.length > 0) {
        const map = new Map(specials.map((s) => [s.id, s] as const));
        for (const c of newClaims) {
          const s = map.get(c.specialId);
          if (s) {
            map.set(c.specialId, {
              ...s,
              status: "claimed",
              claimedAt: c.claimedAt,
              claimedMatchId: c.matchId,
            });
            specialClaims++;
          }
        }
        await setSpecials(Array.from(map.values()));
      }
      if (updatedCursor) await setSpecialCursor(updatedCursor);
      lastScore = simulated.score
        ? `${simulated.home.code} ${simulated.score.home} - ${simulated.score.away} ${simulated.away.code}`
        : "";
    });
  }

  console.log(`\nLatest match: ${lastScore}`);
  console.log(`Specials claimed: ${specialClaims}`);

  // Final verification: read everything back and print counts
  await step("\n7. final verification", async () => {
    const [people, cache, specials] = await Promise.all([
      getParticipants(),
      getOpenfootballCache(),
      getSpecials(),
    ]);
    const played = cache
      ? cache.matches.filter((m) => m.status !== "scheduled").length
      : 0;
    console.log(`   participants: ${people.length}`);
    console.log(`   matches played: ${played} / ${cache?.matches.length}`);
    console.log(
      `   specials: ${specials.filter((s) => s.status === "claimed").length} claimed, ${specials.filter((s) => s.status === "pending").length} pending`,
    );
  });

  // Clean up
  await step("8. wipe (cleanup)", wipeEverything);
  console.log("\n=== smoke-demo passed ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
