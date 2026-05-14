-- Move openfootball refresh scheduling out of Vercel and into Supabase.
--
-- Why: Vercel Hobby plan caps cron frequency at once-per-day, which means
-- specials might lag a goal by 24h. pg_cron + pg_net lets us schedule the
-- refresh inside Postgres at any cadence, independent of the deploy plan.
--
-- How it works:
--   1. pg_cron schedules refresh_openfootball() every 5 minutes.
--   2. refresh_openfootball() reads the deployed app URL + CRON_SECRET from
--      the app_settings table and uses pg_net.http_get to call the existing
--      /api/cron/refresh endpoint.
--   3. That endpoint contains all the TypeScript logic (fetch openfootball,
--      normalise, evaluate specials, write claims). We are NOT reimplementing
--      that in PL/pgSQL.
--
-- After the Vercel deploy is live, populate app_settings:
--   insert into app_settings (key, value) values
--     ('cron_url', 'https://your-app.vercel.app/api/cron/refresh'),
--     ('cron_secret', 'the-CRON_SECRET-env-var-value-from-vercel')
--   on conflict (key) do update set value = excluded.value;
--
-- Until app_settings is populated the cron is a no-op (logs a notice and
-- returns), so the migration is safe to apply before the deploy exists.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ----- app_settings ------------------------------------------------------
-- Small key/value bag for runtime configuration that lives in the database
-- rather than the Next.js process. Currently only the pg_cron job reads it.
-- RLS-locked: only the postgres role (which pg_cron runs as) and the
-- service-role key reach it.

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- ----- refresh_openfootball() --------------------------------------------

create or replace function public.refresh_openfootball()
returns void
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  v_url text;
  v_secret text;
  v_request_id bigint;
begin
  select value into v_url from public.app_settings where key = 'cron_url';
  select value into v_secret from public.app_settings where key = 'cron_secret';

  if v_url is null or v_secret is null then
    raise notice 'refresh_openfootball: app_settings.cron_url or cron_secret missing, skipping';
    return;
  end if;

  select net.http_get(
    url := v_url || '?secret=' || v_secret,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 30000
  ) into v_request_id;

  raise notice 'refresh_openfootball: dispatched request %', v_request_id;
end;
$$;

-- ----- schedule ----------------------------------------------------------
-- Unschedule any prior version, then re-create on the */5 cadence.

do $$
begin
  perform cron.unschedule('refresh-openfootball');
exception
  when others then
    null; -- not previously scheduled
end
$$;

select cron.schedule(
  'refresh-openfootball',
  '*/5 * * * *',
  $$select public.refresh_openfootball();$$
);
