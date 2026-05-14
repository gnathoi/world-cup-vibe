# Goal! The 2026 Sweepstake

A 2026 World Cup sweepstake site for friends. Next.js 16 + Supabase Postgres, in the visual key of the 1966 BBC colour documentary "Goal!".

## What's here

- Email-only sign-up (no password, signed HMAC cookie session)
- Deterministic team allocation with a host-nation guard (USA/CAN/MEX max 1 each when n ≥ 3)
- Reproducible "ceremony" page that replays from the persisted seed
- Banter feed, leaderboard, "who's still in"
- Bookies' Specials: 6 curated side prizes (0-0 final, hat-trick, USA-semi, pen shoot-out, opening-minute goal, red card in the final). Carved from the pot only on trigger
- Admin page for re-rolling the draw + the pot ledger
- openfootball.json adapter feeding live match data into Postgres via pg_cron

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind 4 + TypeScript 5
- Supabase Postgres (data + scheduled refresh via pg_cron + pg_net)
- iron-session for the auth cookie
- @vercel/og for bragging-card image generation (in progress)
- Vitest for unit tests, Playwright slot reserved for E2E

## Local development

```bash
# 1. Install
pnpm install      # or npm install

# 2. Fill in .env.local from .env.example. You need:
#    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
#    SESSION_SECRET (32+ random bytes), ADMIN_PASSWORD, CRON_SECRET

# 3. Apply the schema to the linked Supabase project
supabase link --project-ref <your-project-ref>
supabase db push

# 4. Run the dev server
pnpm dev
```

Hit http://localhost:3000.

### Refreshing openfootball data

The app does NOT auto-refresh on a schedule (deliberately — kept simple). Match data updates only when someone clicks **REFRESH FROM OPENFOOTBALL** in `/admin`. Run that before checking the site after a match has finished.

You can also trigger it from the command line:

```bash
curl http://localhost:3000/api/cron/refresh?secret=$(grep CRON_SECRET .env.local | cut -d= -f2)
```

## Tests

```bash
pnpm test           # vitest run
pnpm typecheck      # tsc --noEmit
pnpm build          # next build (also typechecks)
```

24 unit tests cover the three landmines: allocator determinism, host-nation guard, and the specials evaluator's claim-once cursor.

## Deployment

### Vercel (the app)

1. `vercel link` against the repo (Vercel detects Next.js automatically).
2. Add environment variables in the Vercel dashboard → Settings → Environment Variables:

   | Key | Value | Notes |
   |---|---|---|
   | `SUPABASE_URL` | `https://<ref>.supabase.co` | Same value as local |
   | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Server-only, never exposed to the browser |
   | `SUPABASE_ANON_KEY` | `sb_publishable_...` | Currently unused; set for forward compatibility |
   | `SESSION_SECRET` | 32+ random bytes | `openssl rand -base64 48` |
   | `ADMIN_PASSWORD` | something memorable to friends | Used to gate `/admin` |
   | `CRON_SECRET` | random | Used by the Supabase pg_cron to call `/api/cron/refresh` |
   | `OPENFOOTBALL_URL` | optional | Defaults to the openfootball/worldcup.json master URL |

   Tick all environments (Production, Preview, Development) for the above unless you want different values per environment.

3. Push to `main`. Vercel auto-deploys.

`vercel.json` is currently empty of cron declarations — refresh is manual via the admin UI.

### Supabase (the data layer)

1. From the repo root: `supabase link --project-ref <your-project-ref>`
2. `supabase db push` applies the migrations in `supabase/migrations/`:
   - `20260514181158_init_schema.sql` — tables, RLS, indexes
   - `20260514182430_pg_cron_refresh.sql` — historical: previously enabled pg_cron + pg_net for auto-refresh
   - `20260514183513_remove_pg_cron.sql` — reverses the cron schedule (we now use a manual REFRESH button on /admin)

The openfootball cache is refreshed manually by an admin clicking REFRESH FROM OPENFOOTBALL on `/admin`. No cron required, no Vercel plan upgrade required, no infrastructure to babysit.

## Verification checklist after deploy

- [ ] Visit `https://your-app.vercel.app/` — homepage renders with the 1966 frames + cream background
- [ ] Visit `/signin`, sign up — you land on `/me` with a "the draw is not yet drawn" message
- [ ] Visit `/admin`, log in with `ADMIN_PASSWORD`, click `RE-ROLL THE DRAW` — `/me` and `/` now show your team allocation
- [ ] Manual cron trigger: `curl https://your-app.vercel.app/api/cron/refresh?secret=$CRON_SECRET` returns `{ ok: true, fresh: true, matches: 104, ... }`
- [ ] Wait 5 minutes and check `cron.job_run_details` in Supabase — at least one row with status `succeeded`
- [ ] `kv_store.openfootball:cache` has a recent `fetchedAt`

## Project structure

```
app/                # Next.js routes
  page.tsx          # / homepage
  signin/           # /signin + actions
  me/               # /me — personal page
  ceremony/         # /ceremony — the draw + final ledger
  admin/            # /admin gated page + actions
  api/
    auth/signout/
    cron/refresh/   # cron entry — called by Supabase pg_cron
components/         # 10 bespoke 1966 UI components (Frame, Stamp, …)
lib/                # business logic
  allocator.ts      # deterministic team draw
  auth.ts           # iron-session cookie
  db.ts             # Supabase typed wrapper
  openfootball.ts   # fetch + zod + cache + stale fallback
  specials/         # Bookies' Specials defaults + evaluator
  supabase.ts       # service-role + anon client singletons
  teams.ts          # 48 teams (static fallback when openfootball is empty)
  leaderboard.ts    # standings + scoring rubric
supabase/
  migrations/       # versioned schema (pg-cron migration here)
  config.toml
```
