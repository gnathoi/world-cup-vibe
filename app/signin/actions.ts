"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import {
  addParticipant,
  getParticipantByEmail,
  getAllocation,
} from "@/lib/db";
import { setSession } from "@/lib/auth";
import type { Participant } from "@/lib/types";

export async function signInAction(formData: FormData) {
  const emailRaw = String(formData.get("email") ?? "");
  const displayNameRaw = String(formData.get("displayName") ?? "");
  const email = emailRaw.trim().toLowerCase();
  const displayName = displayNameRaw.trim();

  if (!email || !displayName) {
    throw new Error("Email and display name are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("That email looks malformed.");
  }

  let participant = await getParticipantByEmail(email);
  if (!participant) {
    // Spectator if allocation has already happened.
    const allocation = await getAllocation();
    const spectator = !!allocation;
    participant = {
      id: randomUUID(),
      email,
      displayName,
      signedUpAt: new Date().toISOString(),
      spectator,
      paidIn: false,
    } satisfies Participant;
    await addParticipant(participant);
  }

  await setSession(participant);
  redirect("/me");
}
