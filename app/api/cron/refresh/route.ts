// Vercel Cron entry. Schedule lives in vercel.json. Runs every 5 min by default.
//
// 1. Fetch + cache openfootball.
// 2. Run the specials evaluator against the new snapshot.
// 3. Persist any new claims.
// 4. Revalidate downstream pages.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshFromOpenfootball } from "@/lib/openfootball";
import {
  getSpecials,
  getSpecialCursor,
  setSpecials,
  setSpecialCursor,
} from "@/lib/db";
import { evaluate } from "@/lib/specials/evaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Vercel sends `Authorization: Bearer <CRON_SECRET>` for scheduled runs.
  // We accept either that or a manual call with the right secret in query.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    const fromQuery =
      new URL(req.url).searchParams.get("secret") ?? "";
    const supplied = auth.startsWith("Bearer ")
      ? auth.slice(7)
      : fromQuery;
    if (supplied !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

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

  revalidatePath("/");
  revalidatePath("/me");

  return NextResponse.json({
    ok: true,
    fresh: fetchResult.fresh,
    matches: fetchResult.matches.length,
    newClaims: newClaims.length,
    cursor: updatedCursor,
    reason: fetchResult.fresh ? undefined : fetchResult.reason,
  });
}
