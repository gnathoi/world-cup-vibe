# TELETEXT REDESIGN — Design Plan
Branch: `teletext-frontend`

## Goal
Complete reskin of the Make America Goal Again sweepstake to authentic BBC Ceefax / teletext aesthetic. This is an experimental alternate frontend — not replacing `main`.

## Design Decisions Made

| # | Decision | Choice |
|---|----------|--------|
| D1 | Review depth | Full 7-pass + mockups |
| D2 | Page numbering | Visual-only P100–P600 map, URLs unchanged |
| D3 | Font | Bedstead pixel font, self-hosted |
| D4 | Mobile layout | Responsive single-col, teletext colours/font preserved |
| D5 | Animations | Cursor ▌ blink everywhere + leader/wooden-spoon badge flash |

## Brand

- Primary brand: **MAKE AMERICA GOAL AGAIN** (all caps, always)
- No "World Cup Vibe" text anywhere
- Page identity lives entirely in MAGA + Ceefax page number system

## Page Number Map

| Page | URL | Content |
|------|-----|---------|
| P100 | `/` | Home — Standings (who's still alive) |
| P101 | `/allocation` | Who Has What — full team allocation table (NEW) |
| P200 | `/schedule` | Fixtures |
| P300 | `/me` | My Teams |
| P400 | `/ceremony` | Prize Ceremony |
| P500 | `/signin` | Sign In |
| P600 | `/admin` | Admin (hidden from footer nav) |

Page numbers are cosmetic — visible in header top-left and footer nav, URLs stay unchanged.

---

## Colour System

Replace `app/globals.css` colour variables entirely. New system:

```css
:root {
  --tt-black:   #000000;  /* background everywhere */
  --tt-red:     #FF0000;  /* eliminated badges, error states */
  --tt-green:   #00FF00;  /* still-in badges, success */
  --tt-yellow:  #FFFF00;  /* leader names, section headers, pot amount, MAGA title */
  --tt-blue:    #0000FF;  /* footer nav bar, "YOU" row highlight, masthead title bg */
  --tt-magenta: #FF00FF;  /* specials section header, alternate separators */
  --tt-cyan:    #00FFFF;  /* rank numbers, page numbers, sub-headers */
  --tt-white:   #FFFFFF;  /* body text, regular player names, nav text */
}
```

**No other colours.** No rgba, no opacity variants for colour mixing, no gradients.
The only "opacity" trick allowed: `#000000` for the background ensures contrast everywhere.

### Colour-to-Role Assignments

| Element | Colour |
|---------|--------|
| Page background | black |
| Body text / player names | white |
| Leader name | yellow |
| Your row (bg) | blue |
| Rank numbers | cyan |
| Page number (P100) | cyan |
| Section headers (bg) | magenta (specials), yellow text on black (standings) |
| Footer nav bar (bg) | blue |
| Still In badge (bg) | green, text black |
| Eliminated badge (bg) | red, text white |
| Wooden Spoon badge (bg) | yellow, text black |
| Pot amount | white |
| Pot label | yellow |
| Separator lines | cyan or magenta |
| Error states | red text |
| Loading / cursor | white blinking ▌ |

---

## Typography

### Font
**Bedstead** — pixel-block teletext font, free/open-source (OFL).

Setup:
1. Download Bedstead.woff2 from https://bjh21.me.uk/bedstead/
2. Save to `/public/fonts/Bedstead.woff2`
3. Add `@font-face` in `globals.css`

```css
@font-face {
  font-family: 'Bedstead';
  src: url('/fonts/Bedstead.woff2') format('woff2');
  font-display: swap;
}
```

4. Replace `--font-display`, `--font-sans`, `--font-mono` with single `--font-tt: 'Bedstead', 'Courier New', monospace`
5. Update `layout.tsx`: remove Alfa Slab One, IBM Plex Sans, IBM Plex Mono imports. No Google Fonts.
6. All text uses `--font-tt`. No exceptions.

### Text Rules
- Everything ALL CAPS (use `text-transform: uppercase` globally or per-component)
- No letter-spacing adjustments — Bedstead spacing is baked in
- Base font size: `1rem` = 16px; scale up for headings with `em` multiples
- Line height: 1.4 (matches teletext row spacing)
- `font-weight: normal` everywhere — Bedstead doesn't have a bold variant that changes pixel weight

---

## Layout System

### Full-width, Full-bleed
- `max-width: none` — remove the `max-w-7xl` constraint from all pages
- Body background: `var(--tt-black)` always
- Page padding: `8px` horizontal on all screens (tight, like a TV bezel)
- No box shadows, no border-radius anywhere (`--radius-frame: 0px` already set — keep it)

### Two-Column → Single Column Breakpoint
Desktop (≥768px): two-column grid (standings | specials sidebar)
Mobile (<768px): single column, same page number + footer nav

```css
.tt-page-grid {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 0;
}
@media (max-width: 767px) {
  .tt-page-grid { grid-template-columns: 1fr; }
}
```

### Standard Page Shell (every page)
```
┌─────────────────────────────────────────────────────┐
│ P100          MAKE AMERICA GOAL AGAIN      03 JUN 26 │  ← tt-header
│════════════════════════════════════════════════════ │  ← cyan separator
│ [hero strip / page-specific context bar]            │  ← tt-hero
│────────────────────────────────────────────────────  │  ← magenta separator
│ [main content area]           │ [sidebar if present] │  ← tt-page-grid
│════════════════════════════════════════════════════ │  ← blue footer
│ 200 FIXTURES  300 MY TEAMS  400 CEREMONY  500 SIGN IN│  ← tt-footer
└─────────────────────────────────────────────────────┘
```

Header layout (3-column grid):
- Left: page number in cyan (`P100`)
- Centre: `MAKE AMERICA GOAL AGAIN` in yellow on blue background banner
- Right: date + time in white (`03 JUN 26 / 22:14`)

---

## Animation

```css
@keyframes tt-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
.tt-cursor { animation: tt-blink 1s step-end infinite; }
.tt-flash  { animation: tt-blink 0.8s step-end infinite; }
```

- `.tt-cursor` — the `▌` block cursor, used in loading states and sign-in input
- `.tt-flash` — applied ONLY to: leader name badge, wooden spoon badge
- Everything else: no animation

**`prefers-reduced-motion`:** Disable both animations:
```css
@media (prefers-reduced-motion: reduce) {
  .tt-cursor, .tt-flash { animation: none; opacity: 1; }
}
```

---

## Leaderboard Data Model (Design Implication)

This is a sweepstake — **no points system**. Ranking is:
1. Primary: number of teams still alive (desc)
2. Secondary: goal difference of alive teams (desc)
3. Tertiary: alphabetical

Display per row:
- `N ALIVE` (e.g. "2 ALIVE") instead of "X pts"
- `GD +X` or `GD -X` as secondary stat (if available)
- `ELIMINATED` badge when 0 teams left

---

## Interaction States

| State | Appearance |
|-------|-----------|
| Loading | Yellow text: `PLEASE WAIT...` + white `▌` cursor (blinking) |
| Empty (no draw) | Yellow block: `NO DATA / DRAW NOT YET RUN` + `PRESS P100 TO RETURN` in cyan |
| Error | Red header bar: `ERROR — PAGE UNAVAILABLE` white text |
| Still In | Green bg, black text: `STILL IN` |
| Eliminated | Red bg, white text: `ELIMINATED` |
| Wooden Spoon | Yellow bg, black text: `WOODEN SPOON £20` — with `.tt-flash` |
| Leader | Yellow text name — with `.tt-flash` |
| Your row | Blue bg, white text throughout |

---

## Component Transform Plan

### MastheadBar → TeletextHeader
New layout:
```
P[NUM]    [━━━ MAKE AMERICA GOAL AGAIN ━━━ in yellow on blue]    DD MMM YY
          [STANDINGS  FIXTURES  MY TEAMS]  ← nav in cyan on black
```
- Remove: scarlet background, `font-display`, IBM Plex fonts
- Add: cyan page number left, date right, blue+yellow title centre
- Nav links: cyan text, no hover colour (just `text-decoration: underline` on focus)
- `signedInAs` username: white text, right-aligned, `[USERNAME]` in square brackets

### HeroStrip → TeletextHeroBar  
- Remove: cream bg, halftone texture, `frame-pot`, cobalt stamp
- Add: black bg, left section (green stage text, cyan matchday), right section (plain box-drawing pot box)
- Pot box: hand-drawn with `+--+` box-drawing chars or CSS `border: 2px solid var(--tt-yellow)`
- Stage text: `var(--tt-green)`, size `1.4em`

### Frame → remove
Replace all `<Frame variant="...">` usage with plain `<div>` + inline CSS borders or Tailwind utility classes:
- `primary` → `border: 2px solid var(--tt-cyan)`
- `secondary` → `border: 1px solid var(--tt-white)`
- `chalkboard` → `background: var(--tt-black)` (it already is black)

### RankedRow → TeletextRankedRow
Table-style layout: `<tr>` inside a `<table>` (no CSS Grid for this one — tabular data belongs in a table):
```
| RNK | PLAYER NAME     | STATUS     | ALIVE | GD   |
|  1  | GNATHOI ▌      | STILL IN   |   2   | +3   |
```
- Rank: `var(--tt-cyan)`, right-aligned
- Player: `var(--tt-white)`, leader gets `var(--tt-yellow)` + `.tt-flash`
- Your row: `background: var(--tt-blue)` on `<tr>`
- Status badge: inline-block, bg colour per state
- Team flags: small, space-separated after player name on second line on mobile

### ChalkLine → TeletextChalkLine
Simple flex row:
```
GOLDEN BOOT ................................ £50    GNATHOI
```
- Label: `var(--tt-cyan)`, padded with dots to fill width
- Amount: `var(--tt-green)`
- Owner: `var(--tt-yellow)`
- Pending: `var(--tt-white)` at 50% opacity → use `color: var(--tt-white); opacity: 0.5`

### Stamp → TeletextBadge
Remove the styled `.stamp` class. Replace with inline-block with background colour:
```css
.tt-badge { display: inline-block; padding: 1px 6px; font-size: 0.8em; }
.tt-badge-green  { background: var(--tt-green);   color: var(--tt-black); }
.tt-badge-red    { background: var(--tt-red);     color: var(--tt-white); }
.tt-badge-yellow { background: var(--tt-yellow);  color: var(--tt-black); }
.tt-badge-cyan   { background: var(--tt-cyan);    color: var(--tt-black); }
.tt-badge-blue   { background: var(--tt-blue);    color: var(--tt-white); }
```

### SiteFooter → TeletextFooter
Blue background bar:
```
200 FIXTURES   300 MY TEAMS   400 CEREMONY   500 SIGN IN   ▌
```
- Blue bg, white text for page descriptions, yellow for page numbers
- Blinking `▌` cursor at end
- Admin link (P600): hidden from footer, accessible only by navigating to `/admin`

### BanterPost (if used)
- Black bg, white text
- Headline in yellow
- Dateline in cyan

---

## Page-Specific Specs

### P100 — Home / Standings (`/`)
- Header: P100
- Hero bar: green stage text, cyan matchday, yellow pot box
- Two-column on desktop: standings table (left) | specials sidebar (right)
- Standings: `<table>` with rank/name/status/alive/gd columns
- Empty state: `NO DRAW YET — KICK OFF 11 JUN` in yellow box

### P101 — Who Has What (`/allocation`) — NEW PAGE
- Header: P101
- Full allocation table: all participants × their allocated teams
- Format:
  ```
  PLAYER          TEAMS
  ════════════════════════════════════════════
  GNATHOI         🇫🇷 FRA  🇧🇷 BRA  🏴󠁧󠁢󠁥󠁮󠁧󠁿 ENG  +1 MORE
  ALICE           🇩🇪 GER  🇦🇷 ARG
  BOB             🇺🇸 USA  🇵🇹 POR  🇯🇵 JPN
  ```
- Player column: white text, your row in blue
- Team entries: flag emoji + 3-letter code, space-separated
- Overflow: `+N MORE` in cyan if >4 teams
- Status colouring: still-alive teams in white, eliminated teams in red text (team code only, emoji stays)
- Sub-page indicator: `P101` in header, link in P100 footer: `101 WHO HAS WHAT`
- Data: uses existing `getAllocation()` + `getParticipants()` — no new DB queries needed

### P200 — Fixtures (`/schedule`)
- Header: P200
- Full-width table: date/time | home team | score | away team | stage
- Played matches: score in white; upcoming: `vs` in cyan with kickoff time
- Group headers: magenta background bars between groups

### P300 — My Teams (`/me`)
- Header: P300
- Your allocated teams listed in table: flag | country | status | GD
- Summary line: `N TEAMS ALIVE` in green or `ELIMINATED` in red
- If eliminated: show wooden spoon eligibility in yellow

### P400 — Prize Ceremony (`/ceremony`)
- Header: P400
- Winner announcement: yellow text, `.tt-flash`, centred in blue box
- Prize breakdown table in white
- Wooden spoon section in yellow

### P500 — Sign In (`/signin`)
- Header: P500
- Terminal-style form:
  ```
  ENTER YOUR NAME:
  > [____________] ▌
  
  PRESS ENTER TO CONTINUE
  ```
- Input: white text on black bg, 1px white border, cursor inside
- No labels inside fields — label is on the line above

### P600 — Admin (`/admin`)
- Header: P600  
- Existing Frame layout → replace with same teletext border system
- No nav to this page from footer
- All controls keep their function, just restyled

---

## Implementation Order

1. **Setup Bedstead font** — download, add to `/public/fonts/`, update `layout.tsx`
   (Bedstead download: https://bjh21.me.uk/bedstead/ — grab `bedstead.woff2`)
2. **Rewrite `globals.css`** — new colour variables, Bedstead font stack, `.tt-cursor`, `.tt-flash`, `.tt-badge-*`, `tt-sep` separator utility
3. **TeletextHeader** — replace `MastheadBar` with new component (or restyle in place)
4. **TeletextFooter** — replace `SiteFooter`
5. **TeletextHeroBar** — replace `HeroStrip`
6. **TeletextRankedRow** — replace `RankedRow`
7. **TeletextChalkLine** — replace `ChalkLine`
8. **Remove Frame wrapper** — convert all pages to direct border utilities
9. **Stamp → TeletextBadge** — global find-and-replace
10. **Homepage layout** — full-width, two-col desktop grid
11. **Remaining pages** — schedule, me, ceremony, signin, admin
11b. **P101 Who Has What** — new page `/allocation`, uses existing `getAllocation()` data
12. **Test locally with `bun dev`** — verify all 7 pages
13. **Responsive check** — test at 375px, 768px, 1200px

---

## Emoji Flags

Emoji flags (🇫🇷 🇧🇷 🏴󠁧󠁢󠁥󠁮󠁧󠁿 🇩🇪) render independently of the Bedstead font — the OS emoji layer handles them. Keep all flag usage as-is. No special treatment needed.

Fixtures page: each team cell shows `[flag emoji] [3-LETTER CODE]` — e.g. `🇫🇷 FRA`. Readable at all viewport sizes.

---

## NOT In Scope

| Item | Rationale |
|------|-----------|
| URL-based page routing (/p100) | Visual-only page numbers agreed |
| Mosaic pixel graphics | Requires canvas or SVG sprites — too much effort for an experimental branch |
| Animated page-load "tuning in" effect | Out of scope for v1 |
| Sound effects (teletext key tones) | Distracting; out of scope |

---
| Backend changes for goal-difference ranking | Separate concern; leaderboard display can show existing data |

---

## What Already Exists (Reuse)

- `ChalkLine` structure — the dotted separator between label and price is already correct for teletext
- `RankedRow` grid columns — rank/name/status/teams already in the right order
- `Frame` double-border pattern — CSS borders already `border-radius: 0`
- `Stamp` inline-badge concept — same concept, just needs background colour instead of border
- `app/globals.css` `--radius-frame: 0px` — correctly set

---

## Implementation Tasks

Synthesized from this review's findings. Run with `bun dev` to verify after each task.

- [ ] **T1 (P1, human: ~15min / CC: ~5min)** — Font — Download Bedstead.woff2, add @font-face to globals.css, remove Google Fonts from layout.tsx
  - Files: `app/globals.css`, `app/layout.tsx`, `public/fonts/Bedstead.woff2`
  - Verify: text renders in chunky pixel blocks, not curves
- [ ] **T2 (P1, human: ~30min / CC: ~10min)** — CSS — Rewrite globals.css colour variables, add `.tt-cursor`, `.tt-flash`, `.tt-badge-*`, remove cream/scarlet/cobalt/sepia system
  - Files: `app/globals.css`
  - Verify: `bun dev` shows black background everywhere
- [ ] **T3 (P1, human: ~1h / CC: ~15min)** — TeletextHeader — Replace MastheadBar with P-number / MAGA title / date header
  - Files: `components/MastheadBar.tsx` (or new `components/TeletextHeader.tsx`)
  - Verify: P100 shows in cyan top-left, MAGA in yellow on blue banner, date top-right
- [ ] **T4 (P1, human: ~30min / CC: ~10min)** — TeletextFooter — Replace SiteFooter with blue nav bar
  - Files: `components/SiteFooter.tsx`
  - Verify: blue footer shows `200 FIXTURES 300 MY TEAMS 400 CEREMONY 500 SIGN IN ▌`
- [ ] **T5 (P1, human: ~30min / CC: ~10min)** — TeletextHeroBar — Replace HeroStrip
  - Files: `components/HeroStrip.tsx`
  - Verify: black bg, green stage, cyan matchday, yellow pot box
- [ ] **T6 (P1, human: ~1h / CC: ~20min)** — TeletextRankedRow — Convert to `<table>` with cyan rank, yellow leader, blue "you" row, N ALIVE + GD columns
  - Files: `components/RankedRow.tsx`
  - Verify: all 8 states render correctly (leader, you, still-in, eliminated, wooden-spoon)
- [ ] **T7 (P1, human: ~30min / CC: ~10min)** — TeletextChalkLine — Dot-padded label → amount → owner
  - Files: `components/ChalkLine.tsx`
  - Verify: dots fill the gap, amounts in green, owners in yellow
- [ ] **T8 (P1, human: ~30min / CC: ~10min)** — Remove Frame, convert to border utilities
  - Files: `components/Frame.tsx`, `app/page.tsx`, `app/admin/page.tsx`
  - Verify: no double-rule frame wrappers remaining
- [ ] **T9 (P1, human: ~20min / CC: ~5min)** — Stamp → TeletextBadge
  - Files: `components/Stamp.tsx`, all pages using `<Stamp>`
  - Verify: badges show as coloured blocks, not bordered stamps
- [ ] **T10 (P1, human: ~45min / CC: ~15min)** — Homepage full-width layout with two-col desktop grid
  - Files: `app/page.tsx`
  - Verify: full-width black, two columns on desktop, single column on mobile
- [ ] **T11 (P2, human: ~30min / CC: ~10min)** — Fixtures page P200 — group header bars, flag+code cells, score styling
  - Files: `app/schedule/page.tsx`
  - Verify: emoji flags display, scores in white, kickoff times in cyan
- [ ] **T12 (P2, human: ~20min / CC: ~10min)** — My Teams page P300
  - Files: `app/me/page.tsx`
  - Verify: alive teams in white, eliminated in red text
- [ ] **T13 (P2, human: ~20min / CC: ~10min)** — Ceremony page P400
  - Files: `app/ceremony/page.tsx`
  - Verify: winner in flashing yellow, prize table in white
- [ ] **T14 (P2, human: ~20min / CC: ~10min)** — Sign In page P500 — terminal-style form
  - Files: `app/signin/page.tsx`
  - Verify: `ENTER YOUR NAME: > [____] ▌` layout, no placeholder-as-label
- [ ] **T15 (P2, human: ~20min / CC: ~10min)** — Admin page P600
  - Files: `app/admin/page.tsx`
  - Verify: same teletext borders, no Frame wrappers
- [ ] **T16 (P2, human: ~1h / CC: ~20min)** — NEW P101 Who Has What page (`/allocation`)
  - Files: `app/allocation/page.tsx` (new), update footer nav in TeletextFooter
  - Verify: all participants show with their teams, your row in blue, dead teams in red text
- [ ] **T17 (P3, human: ~20min / CC: ~5min)** — Responsive check at 375px, 768px, 1200px
  - Files: `app/globals.css` (media queries)
  - Verify: no overflow, footer nav wraps gracefully on mobile

---

## Approved Mockups

| Screen | Path | Direction |
|--------|------|-----------|
| Homepage (HTML wireframe) | `~/.gstack/projects/hest-hq-world-cup-vibe/designs/teletext-homepage-20260603/teletext-mockup.html` | Full Ceefax P100 with two-column leaderboard + specials sidebar, blue footer nav |

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAN | score: 2/10 → 9/10, 5 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **VERDICT:** Design Review CLEAR — 5 decisions made (font, page map, mobile, animations, brand). Eng Review required before implementation.
