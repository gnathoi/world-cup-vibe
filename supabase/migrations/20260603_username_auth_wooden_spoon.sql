-- Switch to username-only auth (email optional) and add wooden spoon support.
--
-- 1. Make email nullable so participants can sign up with a username only.
-- 2. Replace the full unique index on email with a partial one (nulls excluded).
-- 3. Enforce unique usernames (case-insensitive).
-- 4. Seed the admin participant (gnathoi / nathey18@hotmail.com).

set search_path = public;

-- 1. Drop NOT NULL on email
alter table public.participants
  alter column email drop not null;

-- 2. Drop the old full unique index; replace with partial (WHERE email IS NOT NULL)
drop index if exists participants_email_lower_idx;

create unique index participants_email_lower_idx
  on public.participants ((lower(email)))
  where email is not null;

-- 3. Unique usernames (display_name), case-insensitive
create unique index participants_display_name_unique_idx
  on public.participants ((lower(display_name)));

-- 4. Seed admin participant
insert into public.participants (email, display_name, spectator, paid_in)
select 'nathey18@hotmail.com', 'gnathoi', false, false
where not exists (
  select 1 from public.participants where lower(display_name) = 'gnathoi'
);
