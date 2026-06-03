-- Add password_hash to participants for admin-managed accounts.
-- Nullable: gnathoi authenticates via ADMIN_PIN env var, not a stored hash.

alter table public.participants
  add column if not exists password_hash text;
