# Deploying Qulture — Docker on a VPS (e.g. Hostinger VPS)

This runs the whole stack — Next.js web, the BullMQ worker, PostgreSQL (pgvector),
Redis, and a Caddy reverse proxy with **automatic HTTPS** — with one command.

> Requires a **VPS plan** (KVM, root). Hostinger shared/Cloud/managed-WordPress
> plans will NOT work (PHP/MySQL only). Recommended size: **2 vCPU / 4 GB+**
> (8 GB if Postgres + Redis run on the same box). Add swap on smaller boxes.

## 1. Point DNS
Create an **A record** for your subdomain (e.g. `qulture.yourdomain.com`) → the
VPS public IP. Caddy needs this resolving before it can issue a certificate.

## 2. Prepare the server
SSH in, then install Docker Engine + Compose plugin:
```bash
curl -fsSL https://get.docker.com | sh
docker compose version   # confirm v2
```
Open the firewall for HTTP/HTTPS:
```bash
ufw allow 80 && ufw allow 443 && ufw allow OpenSSH && ufw enable
```

## 3. Get the code + configure
```bash
git clone <your-repo-url> qulture && cd qulture
cp .env.production.example .env
nano .env          # set DOMAIN, ACME_EMAIL, POSTGRES_PASSWORD, AUTH_SECRET,
                   # NEXTAUTH_URL, DATABASE_URL password, ANTHROPIC_API_KEY…
```
Generate the auth secret: `openssl rand -base64 32`.

## 4. Launch
```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```
Order is handled automatically: Postgres/Redis become healthy → `migrate` runs
`prisma migrate deploy` (and seeds if `SEED_ON_DEPLOY=true`) → `web` + `worker`
start → Caddy issues TLS and serves `https://$DOMAIN`.

Watch it come up:
```bash
docker compose -f docker-compose.prod.yml logs -f migrate web caddy
curl -fsS https://$DOMAIN/api/health    # {"status":"ok","db":"up"}
```
Demo login (if seeded): `demo@qulture.dev` / `demo1234`.

## 5. Updates / redeploys
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
`migrate` re-runs `prisma migrate deploy` (idempotent) on every deploy, so new
migrations apply automatically. Web and worker always deploy from the same image.

## Operations
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f web` (or `worker`).
- **DB backup:** `docker compose -f docker-compose.prod.yml exec postgres pg_dump -U qulture qulture > backup_$(date +%F).sql`
- **Restore:** `cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U qulture qulture`
- **Re-seed (demo):** `docker compose -f docker-compose.prod.yml run --rm migrate npx prisma db seed`

## Going from demo → real product
1. Set `SEED_ON_DEPLOY=false` and don't run the demo seed.
2. Implement `ApiProvider` / `IngestionProvider` stubs, set `DATA_PROVIDER=ingestion`,
   and let the `worker` ingest real data (pipeline: fetch→normalize→score→embed→upsert).
3. **Remove demo affordances:** the pre-filled credentials in
   `src/app/login/login-form.tsx` and the demo users in `prisma/seed.ts`.
4. **Implement webhook HMAC** in `src/lib/webhooks.ts` before exposing
   `/api/webhooks/*`, and set the `*_WEBHOOK_SECRET` envs.
5. Add error monitoring (e.g. Sentry) and rate limiting on LLM/DB-heavy routes.

## External managed DB/Redis (optional, less ops)
Point `DATABASE_URL` at Neon/Supabase (pgvector enabled) and `REDIS_URL` at
Upstash, then delete the `postgres`/`redis` services and their `depends_on`
entries from `docker-compose.prod.yml`. The app needs no code changes.
