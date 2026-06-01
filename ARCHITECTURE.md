# Architecture

Qulture is a single Next.js (App Router) application with API routes, a Prisma/PostgreSQL data layer (pgvector for similarity, full-text search for keywords), Redis + BullMQ for caching and background jobs, and two key abstractions — **`DataProvider`** and **`LLMProvider`** — that keep the rest of the app independent of where data and intelligence come from.

```
src/
  app/                      # pages (route group "(app)" = authenticated) + /api routes
  components/               # UI (shadcn/ui) + feature components
  lib/
    providers/              # DataProvider interface + Mock/Api/Ingestion impls + selector
    llm/                    # LLMProvider interface + Mock/Anthropic impls + selector
    scoring/                # pure scoring fns (fraud, quality, prediction, overlap)
    embeddings/             # deterministic local embedder (pgvector vectors)
    search/                 # shared filter schema (zod) + client option lists
    analytics.ts  webhooks.ts  auth.ts  rbac.ts  db.ts  redis.ts  queue.ts  api.ts
  workers/                  # BullMQ entrypoint (ingestion pipeline + analytics)
prisma/                     # schema.prisma (+ pgvector) · migrations · seed.ts
```

## The `DataProvider` abstraction (the critical seam)

Every read of creator/audience/content data goes through one interface:

```ts
interface DataProvider {
  searchCreators(filters): Promise<SearchResult>;
  getCreator(id): Promise<CreatorDetail | null>;
  getAudienceReport(accountId): Promise<AudienceReportDTO | null>;
  getContent(accountId, limit?): Promise<ContentItemDTO[]>;
  refreshAccount(accountId): Promise<{ ok; message }>;
  lookalikeByCreators(ids, limit): Promise<CreatorSummary[]>;
  lookalikeByBrands(ids, limit): Promise<CreatorSummary[]>;
}
```

The application only ever calls `getDataProvider()` (`src/lib/providers/index.ts`), which returns the implementation selected by the `DATA_PROVIDER` env var. **No page, component, or API route knows which provider is live.** All providers return the same DTOs (`src/lib/providers/types.ts`).

### 1. `MockProvider` (default, `DATA_PROVIDER=mock`)
Backs the app with the **seeded Postgres database**. It is the reference implementation and is fully functional offline:
- **Full-text search** via a generated `tsvector` column + GIN index (`creators.search_vector`).
- **Semantic search & lookalikes** via pgvector cosine distance (`embedding <=> query`) with HNSW indexes; the query vector comes from the same deterministic embedder used at seed time.
- **All 50+ filters** (including JSON audience-distribution share gates) are compiled to parameterized SQL in `buildConditions()`.

### 2. `ApiProvider` (`DATA_PROVIDER=api`)
Documented stubs for official platform APIs (YouTube Data API, TikTok, Instagram Graph, X, Twitch). Integration points, a token-bucket **rate limiter** (`src/lib/providers/rate-limiter.ts`), and the required env vars are all defined; live HTTP calls are marked `TODO` and throw `NotImplementedError` until implemented. Most platforms don't offer broad search, so production discovery is typically served from ingested data (below).

### 3. `IngestionProvider` (`DATA_PROVIDER=ingestion`)
Serves **reads from the same Postgres schema** the bulk pipeline upserts into — so reads are identical to `MockProvider` (it delegates them). `refreshAccount()` enqueues the BullMQ pipeline:

```
fetch → normalize → score → embed → upsert
```

Each stage is a job that enqueues the next (`src/workers/ingestion.worker.ts`), with `TODO` markers for licensed / first-party feeds. The `upsert` stage writes into the exact tables `prisma/seed.ts` writes to (including embeddings via raw SQL), so newly ingested data is immediately served with **zero application changes**.

### How to swap MockProvider for real data
1. Implement the `fetch`/`normalize` stages in `ingestion.worker.ts` against your source, reusing `src/lib/scoring` for the `score` stage and `src/lib/embeddings` (or a real model) for `embed`.
2. Make `upsert` write creators/accounts/audience/content like `prisma/seed.ts`.
3. Set `DATA_PROVIDER=ingestion`, run `npm run worker`, and trigger refreshes. The UI is unchanged.
4. For live per-account pulls, implement `ApiProvider`'s `TODO`s and set `DATA_PROVIDER=api`.

## The `LLMProvider` abstraction

`parseSearchPrompt`, `summarizeProfile`, `draftOutreach`, `draftFollowups` are defined once (`src/lib/llm/types.ts`). `getLLM()` returns:
- **`MockLLM`** (default) — deterministic, rule-based prompt parsing + templated copy. Zero keys, fully offline, unit-tested.
- **`AnthropicLLM`** — real Anthropic model (prompt-cached), used when `ANTHROPIC_API_KEY` is set. It **falls back to the mock on any error**, so AI features never hard-fail.

## Embeddings & vector space

`src/lib/embeddings` is a dependency-free, deterministic feature-hashing embedder producing 384-dim unit vectors. Seed data and runtime queries share this space, so semantic search and lookalikes work offline. Swap it for a real embedding model behind the same `embedText()` signature (keep the dimension in sync with the `vector(384)` columns) — marked `TODO(real-embeddings)`.

## Data model highlights

`Org`/`User`/`Membership` (RBAC: admin/member/viewer) · `Creator` ↔ `PlatformAccount` ↔ `AudienceReport`/`ContentItem` (with pgvector embeddings) · `Brand`/`Campaign`/`CampaignCreator` (stage pipeline) · `OutreachThread`/`OutreachMessage` (draft→approved→sent) · `Contract`/`Payment` · `ConversionEvent`/`PostPerformance` · roadmap: `PredictivePerformance`, `CreatorClaim`, plus `aiGeneratedScore`/`deepfakeScore` fields. See `prisma/schema.prisma`.

## Safety constraints (enforced in code)

- **No secrets in code** — all keys via env.
- **Outreach is never auto-sent** — messages are created as `draft`; "sent" requires an explicit `markSent` user action (`/api/outreach-messages/:id`).
- **Payments/webhooks never auto-charge** — webhook receivers only record attributed conversions for reporting; payment status advances only via explicit action.
- **RBAC** — API mutations require `member`+; reads require `viewer`+ (`src/lib/api.ts`, `src/lib/rbac.ts`).

## Background jobs (BullMQ)

`src/workers/index.ts` runs two workers against Redis: the **ingestion** pipeline and an **analytics** worker (`refresh-account`, `recompute-predictions`). Queues/connections are defined in `src/lib/queue.ts`.
