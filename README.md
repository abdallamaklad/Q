# Qulture

A production-grade, multi-platform **influencer discovery & campaign-management** web app. Discover creators across 8 platforms, analyze audiences, detect fraud, build lookalikes, run campaigns end-to-end, and track ROI — all working offline against ~5,000 seeded creators, with a clean data-source abstraction so real platform APIs and ingestion pipelines plug in later.

> Built with Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Prisma + PostgreSQL + pgvector · Redis + BullMQ · NextAuth v5 · recharts. AI is abstracted behind one interface that defaults to a deterministic offline mock and switches to the Anthropic API when a key is present.

---

## One-command setup

**Prerequisites:** Node 20+, npm, and **Docker** (for PostgreSQL + Redis).

```bash
npm install
npm run setup     # starts Postgres+Redis, runs migrations, seeds ~5,000 creators
npm run dev       # http://localhost:3002
```

`npm run setup` will:
1. create `.env` from `.env.example` (if missing),
2. `docker compose up -d` PostgreSQL (pgvector) + Redis and wait for health,
3. apply Prisma migrations (enabling the `vector` extension + full-text/HNSW indexes),
4. seed the database so **every feature is demonstrable immediately**.

**Demo login:** `demo@qulture.dev` / `demo1234` (also `member@` and `viewer@` for the other roles).

Start the background workers (ingestion + analytics jobs) in a second terminal:

```bash
npm run worker
```

### Manual setup (your own Postgres/Redis)

If you don't use the bundled Docker stack, point `DATABASE_URL`/`REDIS_URL` at your own instances (Postgres **must** have the `vector` extension available), then:

```bash
npm run db:deploy && npm run db:seed
```

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run the app (port 3002) |
| `npm run setup` | One-command Docker + migrate + seed |
| `npm run worker` | Run BullMQ workers (ingestion + analytics) |
| `npm run db:migrate` / `db:deploy` | Apply migrations (dev / prod) |
| `npm run db:seed` | Seed data (override count with `SEED_CREATORS=500`) |
| `npm run db:reset` | Drop, re-migrate, and re-seed |
| `npm test` | Run the Vitest suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

---

## Features

1. **AI prompt search** — free-text (e.g. *"vegan fitness creators in Germany, 10k–50k followers, >5% engagement, female audience 25–34"*) parsed into structured filters + semantic vector search, ranked results.
2. **50+ advanced filters** — platform, follower/engagement/growth ranges, category, keywords, hashtags, brand mentions, location, language, audience demographics (age/gender/geo/interests with min-share gates), content timeframe, fraud/quality gates.
3. **Creator profiles** — cross-platform metrics, recharts audience charts, fake-follower + audience-quality scores, AI summary, comment sentiment, recent content grid, predicted performance.
4. **Lookalike builder** — up to 3 brands or 10 creators → vector nearest-neighbors.
5. **Audience overlap** — compare 2–5 creators → overlap % + combined unique reach.
6. **Shortlists** — save, tag, annotate, CSV export.
7. **Campaigns** — stage board (contacted → negotiating → booked → live → completed), briefs, budget, ROI.
8. **Outreach** — AI-drafted first message + follow-up sequence. **Drafts only** — nothing is ever sent automatically; "Mark as sent" is an explicit user action.
9. **Tracking & ROI** — log post performance + conversions; dashboards for reach, engagement, CPM, revenue, ROAS. Webhook receivers for Shopify/Stripe/GA4 (`/api/webhooks/:source`) record conversions — never auto-charge.
10. **Fraud signals** — fake-follower %, engagement anomalies, suspected pods computed from data and surfaced on profiles and a dedicated dashboard.

**Roadmap differentiators (scaffolded):** predictive performance (heuristic-v1, upgradeable), AI-generated/deepfake detection hooks, first-party creator-claim flow. See `/roadmap` in the app.

---

## Configuration

All config is via env (see [`.env.example`](.env.example)). Key switches:

- **`DATA_PROVIDER`** = `mock` (default) | `api` | `ingestion` — which data source backs the app.
- **`LLM_PROVIDER`** = `mock` (default) | `anthropic` — set `ANTHROPIC_API_KEY` to use the real model; otherwise a deterministic offline LLM powers all AI features.

No secrets are committed; everything reads from env. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for how the `DataProvider` abstraction works and how to swap MockProvider for real feeds.

---

## Tests

```bash
npm test
```

Covers the search-prompt parser, all scoring functions (fraud/quality/overlap/prediction), the embedding similarity layer, and `DataProvider` interface conformance across all three providers.
