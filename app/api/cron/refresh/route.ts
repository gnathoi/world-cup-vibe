// Vercel Cron entry — runs hourly (schedule in vercel.json).
//
// 1. Fetch + cache openfootball.
// 2. Run processSpecials (shared with the admin manual-refresh action):
//    seed defaults -> evaluate match conditions -> attribute claims to owners
//    -> detect wooden spoon -> detect 6-match winning streak.
// 3. Revalidate downstream pages.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { refreshFromOpenfootball } from "@/lib/openfootball";
import { processSpecials } from "@/lib/specials/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  // Fail closed: a missing secret denies access rather than opening the
  // endpoint to the world.
  if (!expected) {
    return NextResponse.json({ error: "cron secret not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const fromQuery = new URL(req.url).searchParams.get("secret") ?? "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : fromQuery;
  if (!safeEqual(supplied, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  // ── 2-5. Seed, evaluate, attribute, wooden spoon, streak ──────────────────
  const summary = await processSpecials(fetchResult.matches);

  revalidatePath("/");
  revalidatePath("/me");

  return NextResponse.json({
    ok: true,
    fresh: fetchResult.fresh,
    matches: fetchResult.matches.length,
    ...summary,
  });
}
