import { Worker, Queue, type Job } from "bullmq";
import type { Platform } from "@prisma/client";
import { redisConnection, QUEUE_NAMES } from "@/lib/queue";
import { getConnector, upsertCreatorBundle } from "@/lib/ingestion";

/**
 * Real ingestion pipeline. Two job types:
 *   discover { platform, query, limit } → connector.discover → enqueue one
 *            `ingest` job per channel found.
 *   ingest   { platform, externalId?, handle? } → connector.ingestChannel
 *            (fetch → normalize → score → embed) → upsertCreatorBundle.
 *
 * Reads serve from the same Postgres tables, so ingested creators appear in
 * search immediately with real metrics + scores (audience is flagged estimated).
 */
interface DiscoverData { platform: Platform; query: string; limit?: number }
interface IngestData { platform: Platform; externalId?: string; handle?: string }
type PipelineData = DiscoverData | IngestData;

const queue = new Queue(QUEUE_NAMES.ingestion, { connection: redisConnection() });

async function handle(job: Job<PipelineData>): Promise<void> {
  if (job.name === "discover") {
    const { platform, query, limit = 10 } = job.data as DiscoverData;
    const refs = await getConnector(platform).discover(query, limit);
    console.log(`[ingestion] discover "${query}" → ${refs.length} channels`);
    for (const ref of refs) {
      await queue.add("ingest", { platform, externalId: ref.externalId, handle: ref.handle }, { removeOnComplete: true, attempts: 2 });
    }
    return;
  }

  if (job.name === "ingest") {
    const { platform, externalId, handle } = job.data as IngestData;
    const bundle = await getConnector(platform).ingestChannel({ externalId: externalId ?? "", handle });
    if (!bundle) {
      console.warn(`[ingestion] ingest: channel not found (${externalId ?? handle})`);
      return;
    }
    const creatorId = await upsertCreatorBundle(bundle);
    console.log(`[ingestion] upserted ${bundle.creator.name} (${bundle.externalId}) → ${creatorId}`);
    return;
  }
}

export function startIngestionWorker(): Worker {
  const worker = new Worker<PipelineData>(QUEUE_NAMES.ingestion, handle, {
    connection: redisConnection(),
    concurrency: 3,
  });
  worker.on("completed", (job) => console.log(`[ingestion] ${job.name} ${job.id} done`));
  worker.on("failed", (job, err) => console.error(`[ingestion] ${job?.name} failed:`, err.message));
  return worker;
}
