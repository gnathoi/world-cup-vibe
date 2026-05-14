// Supabase clients. Two flavours:
//   serviceClient — used by server actions, server components, cron, API routes.
//                   Uses the service-role key. Bypasses RLS. NEVER reaches the browser.
//   anonClient    — used only if/when we add direct browser reads. Uses the anon key.
//                   Subject to RLS policies.
//
// We currently route every interaction through server-side code, so anonClient
// is unused. Kept here for symmetry and so the migration is one file when we
// want a public read path.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceSingleton: SupabaseClient | null = null;
let anonSingleton: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (serviceSingleton) return serviceSingleton;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. See .env.example.",
    );
  }
  serviceSingleton = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: { schema: "public" },
  });
  return serviceSingleton;
}

export function getAnonClient(): SupabaseClient {
  if (anonSingleton) return anonSingleton;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY must be set. See .env.example.",
    );
  }
  anonSingleton = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  });
  return anonSingleton;
}

// Reset singletons. Useful from tests; harmless in production.
export function _resetSupabaseClients(): void {
  serviceSingleton = null;
  anonSingleton = null;
}
