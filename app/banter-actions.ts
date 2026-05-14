"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { appendComment } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function postBanterAction(
  body: string,
): Promise<ActionResult<void>> {
  const me = await getCurrentParticipant();
  if (!me) return { ok: false, error: "SIGN IN BEFORE POSTING" };
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "POST IS EMPTY" };
  if (trimmed.length > 280) return { ok: false, error: "POST TOO LONG" };

  try {
    await appendComment({
      id: randomUUID(),
      participantId: me.id,
      participantDisplayName: me.displayName,
      body: trimmed,
      matchId: null,
      postedAt: new Date().toISOString(),
    });
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("postBanterAction failed", err);
    return { ok: false, error: "WIRE REFUSED — TRY AGAIN" };
  }
}
