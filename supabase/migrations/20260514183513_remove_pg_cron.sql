-- Reverse the pg_cron-based openfootball refresh.
--
-- Decision: replace automated scheduling with a manual REFRESH button on
-- /admin. Friend-group simplicity beats scheduler infrastructure for ~16
-- people. Less moving parts; the bookie pushes the button.
--
-- Keep the pg_cron and pg_net extensions installed — they're harmless when
-- unused, and removing them would block any future re-enabling.

-- 1. Unschedule the cron job (no-op if it was already removed).
do $$
begin
  perform cron.unschedule('refresh-openfootball');
exception
  when others then
    null;
end
$$;

-- 2. Drop the function that the cron called.
drop function if exists public.refresh_openfootball();

-- 3. Drop the settings table used to point pg_cron at the deployed URL.
drop table if exists public.app_settings;
