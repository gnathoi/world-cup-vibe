-- Remove the hardcoded gnathoi/nat admin seed.
-- Users are now created exclusively via scripts/seed_users.py.
DELETE FROM public.participants WHERE lower(display_name) IN ('gnathoi', 'nat');
