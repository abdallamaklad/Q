import "dotenv/config";
import { startIngestionWorker } from "./ingestion.worker";
import { startAnalyticsWorker } from "./analytics.worker";

/**
 * BullMQ worker entrypoint. Run with `npm run worker` (requires Redis).
 * Processes the ingestion pipeline and analytics jobs.
 */
console.log("Starting Qulture workers (ingestion + analytics)…");
const ingestion = startIngestionWorker();
const analytics = startAnalyticsWorker();

async function shutdown() {
  console.log("\nShutting down workers…");
  await Promise.all([ingestion.close(), analytics.close()]);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
