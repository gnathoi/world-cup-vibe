"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getPotPaidBy,
  setPotPaidBy,
  getSpecials,
  setSpecials,
  getSpecialCursor,
  setSpecialCursor,
  addParticipant,
  getParticipantByUsername,
  getAllocation,
} from "@/lib/db";
import { DEFAULT_SPECIALS } from "@/lib/specials/defaults";
import { hashPassword } from "@/lib/password";
import { randomUUID } from "node:crypto";
import { performDraw } from "@/lib/draw";
import { refreshFromOpenfootball } from "@/lib/openfootball";
import { evaluate } from "@/lib/specials/evaluate";
import { getSession } from "@/lib/auth";

export async function verifyAdminPinAction(formData: FormData) {
  const pin = String(formData.get("pin") ?? "").trim();
  const expected = process.env.ADMIN_PIN;
  if (!expected || pin !== expected) {
    throw new Error("Incorrect PIN.");
  }
  const session = await getSession();
  session.adminVerified = true;
  await session.save();
  redirect("/admin");
}

export async function addParticipantAction(formData: FormData) {
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
  const seed = String(formData.get("seed") ?? "").trim() || undefined;
  await performDraw(seed);
  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/admin");
  revalidatePath("/ceremony");
}

export async function togglePaidAction(formData: FormData) {
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
  // Seed specials if the table is empty (first run before draw).
  const existing = await getSpecials();
  if (existing.length === 0) {
    await setSpecials(
      DEFAULT_SPECIALS.map((s) => ({
        ...s,
        ownerParticipantId: null,
        status: "pending" as const,
      })),
    );
  }

  const result = await refreshFromOpenfootball();
  const [specials, cursor] = await Promise.all([
    getSpecials(),
    getSpecialCursor(),
  ]);
  const { newClaims, updatedCursor } = evaluate(result.matches, specials, cursor);
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
  revalidatePath("/admin");
}
