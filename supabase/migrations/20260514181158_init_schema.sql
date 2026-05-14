-- Initial schema for the 1966 World Cup sweepstake.
--
-- Tables:
--   participants     - sweepstake members (email-only auth)
--   allocations      - the single most-recent draw (seed + by_participant)
--   comments         - banter feed (global or per-match)
--   predictions      - predictions side game
--   specials         - Bookies' Specials list with claim status
--   kv_store         - misc small state (openfootball cache, specials cursor)
--
-- RLS is enabled on every table with default-deny. All app-side mutations go
-- through the service-role client (server actions only) which bypasses RLS.
-- If/when we move client reads to anon, we will add SELECT policies per table.

set search_path = public;

-- ----- participants ------------------------------------------------------

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  signed_up_at timestamptz not null default now(),
  spectator boolean not null default false,
  paid_in boolean not null default false
);

create index participants_email_lower_idx
  on public.participants ((lower(email)));

alter table public.participants enable row level security;

-- ----- allocations -------------------------------------------------------
-- Single-row table: the most-recent draw.

create table public.allocations (
  id integer primary key default 1,
  seed text not null,
  allocated_at timestamptz not null default now(),
  by_participant jsonb not null,
  constraint allocations_single_row check (id = 1)
);

alter table public.allocations enable row level security;

-- ----- comments (banter) -------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references public.participants(id) on delete cascade,
  display_name text not null,
  body text not null,
  match_id text, -- null = global feed
  posted_at timestamptz not null default now()
);

create index comments_global_idx
  on public.comments (posted_at desc)
  where match_id is null;

create index comments_match_idx
  on public.comments (match_id, posted_at desc)
  where match_id is not null;

alter table public.comments enable row level security;

-- ----- predictions -------------------------------------------------------

create table public.predictions (
  match_id text not null,
  participant_id uuid not null references public.participants(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  scorer_name text,
  submitted_at timestamptz not null default now(),
  locked_at timestamptz,
  primary key (match_id, participant_id)
);

create index predictions_by_participant_idx
  on public.predictions (participant_id);

alter table public.predictions enable row level security;

-- ----- specials ----------------------------------------------------------

create table public.specials (
  id text primary key,
  label text not null,
  payout_gbp integer not null check (payout_gbp >= 0),
  condition_type text not null,
  condition_params jsonb not null default '{}'::jsonb,
  owner_participant_id uuid references public.participants(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'expired')),
  claimed_at timestamptz,
  claimed_match_id text
);

alter table public.specials enable row level security;

-- ----- kv_store ----------------------------------------------------------
-- Small key/value bag for non-relational state: openfootball cache,
-- specials cursor, etc. JSON value lets us evolve shapes without migrations.

create table public.kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.kv_store enable row level security;

-- ----- trigger: keep kv_store.updated_at fresh ---------------------------

create or replace function public.touch_kv_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger kv_store_touch_updated_at
  before update on public.kv_store
  for each row
  execute function public.touch_kv_updated_at();
