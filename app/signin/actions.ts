"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import {
  addParticipant,
  getParticipantByUsername,
  getAllocation,
} from "@/lib/db";
import { setSession } from "@/lib/auth";
import type { Participant } from "@/lib/types";

const USERNAME_RE = /^[a-zA-Z0-9_]{2,30}$/;

export async function signInAction(formData: FormData) {
  const raw = String(formData.get("username") ?? "").trim();

  if (!USERNAME_RE.test(raw)) {
    throw new Error(
      "Username must be 2–30 characters: letters, numbers, underscores only.",
    );
  }

  let participant = await getParticipantByUsername(raw);
  if (!participant) {
    const allocation = await getAllocation();
    const spectator = !!allocation;
    participant = {
      id: randomUUID(),
      displayName: raw,
      signedUpAt: new Date().toISOString(),
      spectator,
      paidIn: false,
    } satisfies Participant;
    await addParticipant(participant);
  }

  await setSession(participant);
  redirect("/me");
}
