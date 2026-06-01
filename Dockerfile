# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Qulture production image. The same image runs both the web server
# (`npm run start`) and the BullMQ worker (`npm run worker`); the worker command
# is overridden in docker-compose.prod.yml. Prisma needs OpenSSL at runtime.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── deps: install everything (build + worker/seed need dev deps like tsx) ──
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── build: generate Prisma client + build Next.js ──
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ── runtime ──
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=build /app/.next ./.next
RUN npx prisma generate
EXPOSE 3002
# Default command = web server. Worker overrides with: command: ["npm","run","worker"]
CMD ["npm", "run", "start"]
