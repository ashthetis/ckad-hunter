# Hunter Log — CKAD

A Solo Leveling–style progress tracker for CKAD prep. Pure static site — no build step, no backend, no dependencies. Progress is stored in your browser's localStorage.

## What it does

- **Status window**: overall Level, Rank (E → S), XP bar, streak counter
- **Hunter stats**: one XP/level track per CKAD domain (Config & Security, Design & Build, Deployment, Networking, Observability), weighted to match the real exam
- **Quest log**: the 15-session, 5-week study plan pre-loaded as quests, click to complete and earn XP. Add your own side quests any time
- **Projects & Trials**: track bigger efforts (the CKAD-exercises repo, killer.sh simulator attempts, the exam itself) with a progress slider
- **Activity heatmap**: last 13 weeks, like a GitHub contribution graph
- **Export/Import**: since data lives only in this browser, use Export to back up progress as JSON, Import to restore it (or move it to another browser/device manually)

## Run locally

No build tools needed. Either:

```bash
# just open it
open index.html
```

or serve it properly (recommended, avoids some browser file:// quirks):

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then visit the printed URL.

## Deploy to Vercel

Static site, zero config:

```bash
npm i -g vercel   # if you don't have it
cd ckad-hunter
vercel deploy --prod
```

Or push this folder to a GitHub repo and import it in the Vercel dashboard — it'll auto-detect it as a static site.

## Notes on the data model

- Everything is in one `localStorage` key (`ckadHunterData_v1`). Nothing is sent anywhere — this is 100% client-side.
- If you clear browser data or switch browsers, your progress goes with it unless you've exported a backup first.
- If you later want progress to follow you across devices, the natural next step is swapping localStorage for a small hosted database (e.g. Vercel Postgres or a free tier of Supabase) — the UI code wouldn't need to change much, just the load/save functions in `app.js`.

## Leveling math

- XP required to go from level *n* to *n+1* = `100 + (n-1) * 25` (grows linearly, so it gets a bit harder each level, on purpose)
- Rank thresholds: E (1-9), D (10-19), C (20-29), B (30-39), A (40-49), S (50+)
- Each of the 5 domain stats levels independently using the same formula, based only on XP earned toward that domain
