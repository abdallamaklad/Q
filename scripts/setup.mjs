#!/usr/bin/env node
/**
 * One-command setup for Qulture.
 *
 *   npm run setup
 *
 * Steps:
 *   1. Ensure a .env exists (copies .env.example if missing).
 *   2. Start Postgres + Redis via docker-compose and wait for health.
 *   3. Apply Prisma migrations (creates the `vector` extension + schema).
 *   4. Seed ~5,000 creators and all supporting data.
 *
 * Requires Docker (Desktop or engine). If Docker is unavailable, the script
 * prints guidance and exits non-zero.
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const run = (cmd, opts = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
};
const has = (cmd) => spawnSync(cmd, ["--version"], { stdio: "ignore" }).status === 0;

function dockerCompose() {
  // Prefer `docker compose` (v2); fall back to `docker-compose` (v1).
  if (spawnSync("docker", ["compose", "version"], { stdio: "ignore" }).status === 0) {
    return "docker compose";
  }
  if (has("docker-compose")) return "docker-compose";
  return null;
}

console.log("── Qulture setup ─────────────────────────────────────────────");

// 1. .env
const envPath = path.join(root, ".env");
if (!existsSync(envPath)) {
  copyFileSync(path.join(root, ".env.example"), envPath);
  console.log("Created .env from .env.example");
} else {
  console.log(".env already exists — leaving it untouched");
}

// 2. Containers
const compose = dockerCompose();
if (!compose) {
  console.error(
    "\n✗ Docker not found.\n" +
      "  Qulture needs PostgreSQL (pgvector) + Redis. Install Docker Desktop\n" +
      "  (https://docs.docker.com/get-docker/) then re-run `npm run setup`.\n" +
      "  Alternatively, point DATABASE_URL/REDIS_URL at your own instances\n" +
      "  (Postgres must have the `vector` extension) and run:\n" +
      "    npm run db:deploy && npm run db:seed\n"
  );
  process.exit(1);
}

run(`${compose} up -d`);

// 3. Wait for Postgres health.
console.log("\nWaiting for Postgres to become healthy…");
const deadline = Date.now() + 90_000;
let ready = false;
while (Date.now() < deadline) {
  const res = spawnSync(
    "docker",
    ["exec", "qulture-postgres", "pg_isready", "-U", "qulture", "-d", "qulture"],
    { stdio: "ignore" }
  );
  if (res.status === 0) {
    ready = true;
    break;
  }
  spawnSync("sleep", ["2"]);
}
if (!ready) {
  console.error("✗ Postgres did not become ready in time. Check `docker compose logs postgres`.");
  process.exit(1);
}
console.log("✓ Postgres is ready");

// 4. Migrate + seed.
run("npx prisma migrate deploy");
run("npx prisma db seed");

console.log(
  "\n✓ Setup complete.\n" +
    "  Start the app:     npm run dev      → http://localhost:3002\n" +
    "  Start the worker:  npm run worker   (BullMQ ingestion/analytics jobs)\n" +
    "  Demo login:        demo@qulture.dev / demo1234\n"
);
