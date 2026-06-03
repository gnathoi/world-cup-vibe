// Signed HMAC session cookie via iron-session. Friend-group threat model:
// we want to make casual impersonation impossible without claiming
// industrial-strength security.

import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { getParticipantById } from "./db";
import type { Participant } from "./types";

export type SessionData = {
  participantId?: string;
  adminVerified?: boolean;
};

const SESSION_COOKIE = "goal-2026-session";

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters. See .env.example.",
    );
  }
  return {
    cookieName: SESSION_COOKIE,
    password,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // 1 year — covers the whole tournament + the off-season nostalgia
      maxAge: 60 * 60 * 24 * 365,
    },
  };
}

export async function getSession() {
  const store = await cookies();
  return await getIronSession<SessionData>(store, sessionOptions());
}

export async function setSession(p: Participant): Promise<void> {
  const session = await getSession();
  session.participantId = p.id;
  await session.save();
}

export async function clearSession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

// Resolve the current user. Returns null when no session OR the participant
// has been removed (deleted from KV). Re-validating against the store on
// every call prevents a stale cookie from outlasting a deleted account.
export async function getCurrentParticipant(): Promise<Participant | null> {
  const session = await getSession();
  if (!session.participantId) return null;
  return await getParticipantById(session.participantId);
}
