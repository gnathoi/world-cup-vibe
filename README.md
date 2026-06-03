# Make America Goal Again

A World Cup 2026 sweepstake for friends. Built with Next.js 16, Supabase Postgres, and styled after the 1966 BBC documentary "Goal!".

## Features

- Username-only sign-up (no password, no email)
- Deterministic team draw at tournament kickoff — teams divided equally, host nations (USA/CAN/MEX) capped at one per person
- Live fixture list and leaderboard powered by openfootball.json
- Bookies' Specials — side prizes that auto-award to whoever's team triggers the event first
- Wooden spoon — £10 for the first player with all teams knocked out
- PIN-gated admin panel for draw management and the paid-in ledger
- Daily Vercel cron keeps match data fresh; auto-allocates teams at midnight UTC on 11 June 2026

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind 4 + TypeScript
- **Supabase Postgres** — data, RLS, no pg_cron required
- **iron-session** — signed HMAC cookie auth
- **Vercel** — hosting + daily cron job

## Local development

```bash
pnpm install

# Copy .env.example to .env.local and fill in:
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
#   SESSION_SECRET (openssl rand -base64 48)
#   CRON_SECRET, ADMIN_PIN

supabase link --project-ref <your-project-ref>
supabase db push

pnpm dev
```

Trigger a manual data refresh at any time:
```bash
curl http://localhost:3000/api/cron/refresh?secret=<CRON_SECRET>
```

## Deployment

1. Push to GitHub, import the repo on [vercel.com/new](https://vercel.com/new)
2. Set environment variables in Vercel dashboard (see `.env.example`)
3. Run `supabase db push` to apply migrations
4. Visit `/admin`, enter your PIN, hit **REFRESH FROM OPENFOOTBALL** to seed match data and specials

## Project structure

```
app/
  page.tsx          # Homepage — leaderboard + specials
  signin/           # Sign-up / sign-in
  me/               # Personal dashboard — your teams + specials
  schedule/         # Full fixture list
  ceremony/         # The draw ledger (read-only replay from seed)
  admin/            # PIN-gated admin — draw, refresh, paid-in ledger
  api/cron/refresh/ # Cron endpoint — data refresh + event detection
components/         # 1966-themed UI (Frame, Stamp, RankedRow, …)
lib/
  allocator.ts      # Deterministic Fisher-Yates team draw
  leaderboard.ts    # Points + standings computation
  openfootball.ts   # Fetch + Zod + cache adapter
  specials/         # Side prize defaults + event evaluator
  draw.ts           # Shared allocation logic
  db.ts             # Supabase typed wrapper
supabase/
  migrations/       # Versioned schema
```
