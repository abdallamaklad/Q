import { Queue, QueueEvents, type ConnectionOptions } from "bullmq";
import { env } from "./env";

/**
 * Connection options for BullMQ. We pass plain options (not a shared ioredis
 * instance) so BullMQ manages its own connections with the required
 * `maxRetriesPerRequest: null`, and to avoid type clashes between the app's
 * ioredis and the copy bundled with bullmq.
 */
export function redisConnection(): ConnectionOptions {
  const u = new URL(env.redisUrl);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    password: u.password || undefined,
    username: u.username || undefined,
    maxRetriesPerRequest: null,
  };
}

// NOTE: BullMQ forbids ":" in queue names (it uses ":" for internal Redis keys).
export const QUEUE_NAMES = {
  ingestion: "qulture-ingestion",
  analytics: "qulture-analytics",
} as const;

// Ingestion pipeline jobs: `discover` (keyword search → enqueue per-channel
// `ingest` jobs) and `ingest` (fetch → normalize → score → embed → upsert one channel).
export type IngestionJobName = "discover" | "ingest";
export type AnalyticsJobName = "refresh-account" | "recompute-predictions";

const globalForQueue = globalThis as unknown as {
  ingestionQueue?: Queue;
  analyticsQueue?: Queue;
};

export const ingestionQueue =
  globalForQueue.ingestionQueue ?? new Queue(QUEUE_NAMES.ingestion, { connection: redisConnection() });

export const analyticsQueue =
  globalForQueue.analyticsQueue ?? new Queue(QUEUE_NAMES.analytics, { connection: redisConnection() });

if (process.env.NODE_ENV !== "production") {
  globalForQueue.ingestionQueue = ingestionQueue;
  globalForQueue.analyticsQueue = analyticsQueue;
}

export function queueEvents(name: string): QueueEvents {
  return new QueueEvents(name, { connection: redisConnection() });
}
