-- Clear all sweepstake data. Run this before re-seeding users and allocation.
-- Usage: supabase db execute --file supabase/truncate_all.sql --project-ref <YOUR_REF>
TRUNCATE participants, allocations, comments, predictions, specials, kv_store RESTART IDENTITY CASCADE;
