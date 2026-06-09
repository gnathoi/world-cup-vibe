# Setup — World Cup 2026 Sweepstake

Run these steps from your laptop where Supabase CLI is already configured.

## Prerequisites

- Supabase CLI logged in (`supabase login` if not)
- `.env.local` already set up with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.
- Python 3.12 `.venv` with dependencies installed (`pip install -r scripts/requirements.txt`)

## Steps

### 1. Pull the branch

```bash
git fetch && git checkout feat/manual-draw-simplify
```

### 2. Push the new migration

Applies the migration that removes the old hardcoded admin seed.

```bash
supabase link --project-ref mvbodryyuvdzuuxqepkm
supabase db push
```

### 3. Clear all existing data

Wipes participants, allocations, comments, predictions, specials, kv_store.
The table structure stays intact.

```bash
supabase db execute --file supabase/truncate_all.sql --project-ref mvbodryyuvdzuuxqepkm
```

### 4. Create users.txt

Create a file called `users.txt` in the project root (already gitignored).
One user per line, format `username:password`. The user named `admin` is
created as a spectator and excluded from the draw.

```
# World Cup 2026 sweepstake — DO NOT COMMIT
admin:<password>
nat:<password>
tom:<password>
...one line per player...
```

Passwords were shared separately — check your notes.

### 5. Seed users

Creates all 14 participants in Supabase with hashed passwords.

```bash
.venv/bin/python scripts/seed_users.py users.txt
```

You should see each username printed with their role (player / ADMIN spectator).

### 6. Run the draw

Runs 10 000 simulated draws, saves a distribution heatmap, picks one at random
and writes the allocation to Supabase.

```bash
.venv/bin/python scripts/run_draw.py
```

You'll see who got which teams printed to the terminal.
The heatmap is saved to `public/draw_distribution.png`.

### 7. Verify in the app

```bash
npm run dev
```

- Sign in as `nat` / `oak-drum` → should land on `/me` and show your teams
- Sign in as `admin` / `lime-fox` → lands on `/me`, then go to `/admin` and enter your `ADMIN_PIN`
- Check `/` (leaderboard) and `/ceremony` show the draw

### 8. Deploy to Vercel

Push the branch (or merge to main) and Vercel will pick it up automatically.
Make sure these env vars are set in the Vercel dashboard:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `ADMIN_PIN`
- `CRON_SECRET`
- `OPENFOOTBALL_URL`

Then hit the cron manually once to seed match data and specials:

```bash
curl https://<your-vercel-url>/api/cron/refresh?secret=<CRON_SECRET>
```

## Supabase project

`https://mvbodryyuvdzuuxqepkm.supabase.co`

API keys: `https://supabase.com/dashboard/project/mvbodryyuvdzuuxqepkm/settings/api`
