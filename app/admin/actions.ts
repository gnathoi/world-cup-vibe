"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getPotPaidBy,
  setPotPaidBy,
  addParticipant,
  getParticipantByUsername,
  getAllocation,
} from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { randomUUID } from "node:crypto";
import { performDraw } from "@/lib/draw";
import { refreshFromOpenfootball } from "@/lib/openfootball";
import { processSpecials } from "@/lib/specials/process";
import { getSession } from "@/lib/auth";
import { timingSafeEqual } from "node:crypto";

// Constant-time string compare that never throws on length mismatch.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Guard for every mutating admin action. Server actions are independent POST
// endpoints — the PIN gate on the page render does NOT protect them, so each
// action must re-check the session flag or any signed-in player could call it.
async function requireAdmin(): Promise<void> {
  const session = await getSession();
  if (!session.adminVerified) throw new Error("Admin access required.");
}

export async function verifyAdminPinAction(formData: FormData) {
  const pin = String(formData.get("pin") ?? "").trim();
  const expected = process.env.ADMIN_PIN;
  // Wrong/missing PIN redirects back with an error flag instead of throwing —
  // a thrown error renders the scary "A server error occurred" 500 page.
  if (!expected || !safeEqual(pin, expected)) {
    redirect("/admin?error=pin");
  }
  const session = await getSession();
  session.adminVerified = true;
  await session.save();
  redirect("/admin");
}

export async function addParticipantAction(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!username || !password) throw new Error("Username and password required.");
  if (!/^[a-zA-Z0-9_]{2,30}$/.test(username)) {
    throw new Error("Username must be 2–30 characters: letters, numbers, underscores.");
  }

  const existing = await getParticipantByUsername(username);
  if (existing) throw new Error(`Username "${username}" is already taken.`);

  const allocation = await getAllocation();
  const passwordHash = await hashPassword(password);

  await addParticipant({
    id: randomUUID(),
    displayName: username,
    signedUpAt: new Date().toISOString(),
    spectator: !!allocation,
    paidIn: false,
    passwordHash,
  });

  revalidatePath("/admin");
}

export async function reallocateAction(formData: FormData) {
  await requireAdmin();
  const seed = String(formData.get("seed") ?? "").trim() || undefined;
  if (seed && seed.length > 256) throw new Error("Seed too long (max 256 chars).");
  await performDraw(seed);
  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/admin");
  revalidatePath("/ceremony");
}

export async function togglePaidAction(formData: FormData) {
  await requireAdmin();
  const participantId = String(formData.get("participantId") ?? "");
  if (!participantId) throw new Error("Missing participantId");
  const current = await getPotPaidBy();
  const next = current.includes(participantId)
    ? current.filter((id) => id !== participantId)
    : [...current, participantId];
  await setPotPaidBy(next);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function refreshOpenfootballAction() {
  await requireAdmin();
  // Wrap the fetch so a malformed upstream payload surfaces as a friendly
  // message instead of the scary "A server error occurred" 500 page. This
  // runs the SAME pipeline as the hourly cron (seed → evaluate → attribute →
  // wooden spoon → streak) via processSpecials, so the two paths can't drift.
  try {
    const result = await refreshFromOpenfootball();
    await processSpecials(result.matches);
  } catch (err) {
    console.error("manual openfootball refresh failed", err);
    redirect("/admin?error=refresh");
  }
  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/admin");
}
