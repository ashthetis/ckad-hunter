# Hunter Log — CKAD

A gamified progress tracker for studying toward the Certified Kubernetes Application Developer exam. Pure static site — no build step, no backend, no dependencies, runs entirely in your browser.

## What is the CKAD?

The Certified Kubernetes Application Developer (CKAD) is a certification from the Cloud Native Computing Foundation (CNCF) and Linux Foundation that verifies you can design, build, deploy, and troubleshoot applications on Kubernetes. It's aimed at developers, not cluster administrators — the sister certification, CKA, covers cluster operations instead.

A few things that make it distinctive as an exam:

- **It's entirely hands-on.** No multiple choice. You're given a live terminal connected to a real Kubernetes cluster and 15-20 tasks to complete — build a Pod that does X, fix a broken Service, debug a crashing container — all within a 2-hour window.
- **It's open-book**, in a narrow sense: you get a second browser tab to the official kubernetes.io docs during the exam. That doesn't make it easy — with 15-20 tasks and 2 hours, looking things up on every question means running out of time. It rewards people who've actually practiced, not people who've memorized.
- **It's proctored and remote.** A human watches you over webcam, checks your ID, and scans your workspace before you start.
- Passing score is **66%**. The exam is based on the current Kubernetes release (v1.35 as of this writing), costs around $445, stays valid for **2 years**, and includes **one free retake** plus **two practice attempts on killer.sh** (a simulator harder than the real thing, used to calibrate readiness).

### What's actually tested

The curriculum is split into five domains, each carrying a different weight on the exam:

| Domain | Weight | Covers |
|---|---|---|
| Application Environment, Configuration and Security | 25% | ConfigMaps, Secrets, resource requests/limits/quotas, SecurityContexts, ServiceAccounts, RBAC, CRDs/Operators |
| Application Design and Build | 20% | Container images, choosing the right workload (Deployment/DaemonSet/Job/CronJob), multi-container pod patterns, volumes |
| Application Deployment | 20% | Rolling updates, blue/green & canary strategies, Helm, Kustomize |
| Services and Networking | 20% | Services, Ingress, NetworkPolicies |
| Application Observability and Maintenance | 15% | Probes, logs, debugging, API deprecations |

Config & Security is the single biggest chunk of the exam — worth studying disproportionately hard relative to the others.

## How Hunter Log helps

Studying for a hands-on exam like this is mostly about repetition — doing the same category of task enough times that the `kubectl` commands and YAML shapes become muscle memory, not something you have to think through. That's hard to stay motivated for over 5+ weeks on your own, so this site turns the study plan into something closer to a game:

- **The Dungeon Path** turns each study session into an enemy on a winding trail through the woods. Complete the session, slay the enemy, watch the party marker move forward. Each week ends in a bigger "week boss" — a short timed test with no notes allowed, synthesizing that week's material — and week 5 closes with a full-size boss: the complete mock exam.
- **Hunter Stats** track XP separately per exam domain (Config & Security, Design & Build, Deployment, Networking, Observability), weighted the same way the real exam is. If your Config & Security stat is lagging behind the others, that's a direct signal of where you're actually weak — not just a feeling.
- **The Quest Log** has the entire 5-week plan pre-loaded, and each session already has real practice tasks and solutions built in, so you're never staring at a blank "study Kubernetes" checkbox with no idea what to actually do.
- **The 5-week calendar** gives you the whole plan at a glance so you're not scrolling through a long list to see what's ahead.
- **Projects & Trials** track the bigger milestones outside the daily quests — working through the community CKAD-exercises repo, both killer.sh simulator attempts, and finally sitting the real exam.
- **Levels, ranks (E through S), and a day streak** exist purely to make consistent practice feel like it's accumulating into something, the same way an RPG makes grinding feel worthwhile.

None of this replaces actually doing the work — it's scaffolding to make doing the work five weeks straight less likely to fall apart by week two.

## Using it day to day

1. Open the site (locally, or wherever you've deployed it) and work through today's quest in the log or on the path — read the task, try it yourself in a real cluster (`kind` or `minikube`, see below) before checking the solution.
2. Mark it complete to earn XP and watch your stats and the path update.
3. Once a week, expect a bigger "week boss" test — no solutions to lean on until you've genuinely tried.
4. Check Projects & Trials periodically for the standalone milestones (external repo, simulators, the real exam).
5. If you want a nudge instead of remembering on your own, an AI assistant like Claude can set up a recurring reminder to open the site and do the next session — that's how this one got its Mon/Wed/Fri drill cadence originally.

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

## Deploy to GitHub Pages

Also zero-config, since there's no build step:
1. Push this folder's contents (`index.html`, `styles.css`, `app.js`, `forest-bg.svg`, `README.md`) to a GitHub repo.
2. Repo Settings → Pages → Source: "Deploy from a branch," Branch: `main`, folder: `/ (root)` → Save.
3. Your site is live at `https://yourusername.github.io/reponame/` within a minute or two.

## Notes on the data model

- Everything is in one `localStorage` key (`ckadHunterData_v2`). Nothing is sent anywhere — this is 100% client-side.
- If you clear browser data or switch browsers, your progress goes with it unless you've exported a backup first.
- New quests or projects added to the site in the future automatically merge into your saved progress — your existing completions and XP aren't lost.
- If you later want progress to follow you across devices, the natural next step is swapping localStorage for a small hosted database (e.g. Vercel Postgres or a free tier of Supabase) — the UI code wouldn't need to change much, just the load/save functions in `app.js`.

## Leveling math

- XP required to go from level *n* to *n+1* = `100 + (n-1) * 25` (grows linearly, so it gets a bit harder each level, on purpose)
- Rank thresholds: E (1-9), D (10-19), C (20-29), B (30-39), A (40-49), S (50+)
- Each of the 5 domain stats levels independently using the same formula, based only on XP earned toward that domain
