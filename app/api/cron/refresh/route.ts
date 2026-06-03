// Vercel Cron entry — runs every 30 min (schedule in vercel.json).
//
// 1. Fetch + cache openfootball.
// 2. Run the specials evaluator against the new snapshot.
// 3. Persist any new claims.
// 4. Auto-allocate teams if the tournament has started and no draw has run yet.
// 5. Detect the wooden spoon winner (first player fully eliminated).
// 6. Revalidate downstream pages.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshFromOpenfootball } from "@/lib/openfootball";
import {
  getSpecials,
  getSpecialCursor,
  setSpecials,
  setSpecialCursor,
  getAllocation,
  getParticipants,
  getWoodenSpoonWinner,
  setWoodenSpoonWinner,
} from "@/lib/db";
import { evaluate } from "@/lib/specials/evaluate";
import { computeStandings } from "@/lib/leaderboard";
import { performDraw } from "@/lib/draw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Teams allocated at or after this timestamp (midnight UTC on 11 June 2026).
const ALLOCATION_UTC = new Date("2026-06-11T00:00:00Z").getTime();

export async function GET(req: Request) {
  // Vercel sends `Authorization: Bearer <CRON_SECRET>` for scheduled runs.
  // Manual calls can pass ?secret=... in the query string.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    const fromQuery = new URL(req.url).searchParams.get("secret") ?? "";
    const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : fromQuery;
    if (supplied !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // ── 1. Refresh openfootball ────────────────────────────────────────────────
  let fetchResult;
  try {
    fetchResult = await refreshFromOpenfootball();
  } catch (err) {
    console.error("openfootball refresh failed", err);
    return NextResponse.json(
      { ok: false, stage: "fetch", error: (err as Error).message },
      { status: 503 },
    );
  }

  // ── 2–3. Specials evaluation ───────────────────────────────────────────────
  const [specials, cursor] = await Promise.all([
    getSpecials(),
    getSpecialCursor(),
  ]);

  const { newClaims, updatedCursor } = evaluate(
    fetchResult.matches,
    specials,
    cursor,
  );

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
      }
    }
    await setSpecials(Array.from(map.values()));
  }

  if (updatedCursor && updatedCursor !== cursor) {
    await setSpecialCursor(updatedCursor);
  }

  // ── 4. Auto-allocate at tournament start ───────────────────────────────────
  let autoAllocated = false;
  if (Date.now() >= ALLOCATION_UTC) {
    const allocation = await getAllocation();
    if (!allocation) {
      const participants = await getParticipants();
      const eligible = participants.filter((p) => !p.spectator);
      if (eligible.length > 0) {
        try {
          await performDraw();
          autoAllocated = true;
          revalidatePath("/ceremony");
          revalidatePath("/admin");
        } catch (err) {
          console.error("auto-allocation failed", err);
        }
      }
    }
  }

  // ── 5. Wooden spoon detection ──────────────────────────────────────────────
  let woodenSpoonAwarded = false;
  const knockoutStarted = fetchResult.matches.some(
    (m) => m.round !== "group" && m.score,
  );
  if (knockoutStarted) {
    const existingWinner = await getWoodenSpoonWinner();
    if (!existingWinner) {
      const [participants, allocation, currentSpecials] = await Promise.all([
        getParticipants(),
        getAllocation(),
        getSpecials(),
      ]);
      const standings = computeStandings(
        participants,
        allocation,
        fetchResult.matches,
      );
      const eliminated = standings.filter((r) => !r.stillIn && r.teamCodes.length > 0);
      if (eliminated.length > 0) {
        eliminated.sort((a, b) => {
          if (a.points !== b.points) return a.points - b.points;
          return a.displayName.localeCompare(b.displayName);
        });
        const winner = eliminated[0];
        await setWoodenSpoonWinner(winner.participantId);
        // Also claim the wooden_spoon special in the specials table.
        const woodenSpoonSpecial = currentSpecials.find(
          (s) => s.condition.type === "wooden_spoon",
        );
        if (woodenSpoonSpecial && woodenSpoonSpecial.status === "pending") {
          const updatedSpecials = currentSpecials.map((s) =>
            s.id === woodenSpoonSpecial.id
              ? {
                  ...s,
                  ownerParticipantId: winner.participantId,
                  status: "claimed" as const,
                  claimedAt: new Date().toISOString(),
                }
              : s,
          );
          await setSpecials(updatedSpecials);
        }
        woodenSpoonAwarded = true;
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/me");

  return NextResponse.json({
    ok: true,
    fresh: fetchResult.fresh,
    matches: fetchResult.matches.length,
    newClaims: newClaims.length,
    cursor: updatedCursor,
    autoAllocated,
    woodenSpoonAwarded,
    reason: fetchResult.fresh ? undefined : fetchResult.reason,
  });
}
