"use server";

import { redirect } from "next/navigation";
import { getParticipantByUsername } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function signInAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    redirect("/signin?error=1");
  }

  const participant = await getParticipantByUsername(username);
  if (!participant) {
    redirect("/signin?error=1");
  }

  if (!participant.passwordHash) {
    redirect("/signin?error=1");
  }
  const valid = await verifyPassword(password, participant.passwordHash);
  if (!valid) {
    redirect("/signin?error=1");
  }

  await setSession(participant);
  redirect("/me");
}
