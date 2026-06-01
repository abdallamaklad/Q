import { Worker, Queue, type Job } from "bullmq";
import { redisConnection, QUEUE_NAMES, type IngestionJobName } from "@/lib/queue";

/**
 * Ingestion pipeline skeleton: fetch → normalize → score → embed → upsert.
 *
 * Each stage enqueues the next so the pipeline is observable and resumable.
 * Stages are intentionally stubbed with clear TODO markers — wire them to your
 * licensed / first-party data feeds. The shapes below mirror what MockProvider
 * already produces (see src/lib/providers/mock-data.ts), so the upsert stage
 * can write into the same schema the rest of the app reads.
 */

interface PipelinePayload {
  accountId?: string;
  source?: string; // e.g. "youtube", "licensed-feed-x"
  stage: IngestionJobName;
  raw?: unknown; // carried between stages
  normalized?: unknown;
}

const queue = new Queue(QUEUE_NAMES.ingestion, { connection: redisConnection() });

async function handle(job: Job<PipelinePayload>): Promise<void> {
  const data = job.data;
  switch (job.name as IngestionJobName) {
    case "fetch": {
      // TODO(ingestion): fetch raw records from the external/licensed source,
      // respecting that source's rate limits and pagination.
      console.log(`[ingestion] fetch ${data.accountId ?? data.source ?? ""}`);
      await queue.add("normalize", { ...data, stage: "normalize", raw: { placeholder: true } });
      break;
    }
    case "normalize": {
      // TODO(ingestion): map provider-specific fields → Qulture's canonical
      // creator/account/content/audience shapes.
      await queue.add("score", { ...data, stage: "score", normalized: { placeholder: true } });
      break;
    }
    case "score": {
      // TODO(ingestion): run scoring (fakeFollowerScore, audienceQualityScore,
      // engagementAnomaly, suspectedPod) from src/lib/scoring on normalized data.
      await queue.add("embed", { ...data, stage: "embed" });
      break;
    }
    case "embed": {
      // TODO(ingestion): compute embeddings with src/lib/embeddings.embedCreatorText
      // (or a real model) for creators/content.
      await queue.add("upsert", { ...data, stage: "upsert" });
      break;
    }
    case "upsert": {
      // TODO(ingestion): upsert into Postgres (creators/platform_accounts/
      // audience_reports/content_items) and write embeddings via raw SQL, exactly
      // as prisma/seed.ts does. After upsert the MockProvider/IngestionProvider
      // reads serve the new data with no app changes.
      console.log(`[ingestion] upsert complete for ${data.accountId ?? data.source ?? ""}`);
      break;
    }
  }
}

export function startIngestionWorker(): Worker {
  const worker = new Worker<PipelinePayload>(QUEUE_NAMES.ingestion, handle, {
    connection: redisConnection(),
    concurrency: 5,
  });
  worker.on("completed", (job) => console.log(`[ingestion] ${job.name} ${job.id} done`));
  worker.on("failed", (job, err) => console.error(`[ingestion] ${job?.name} failed:`, err.message));
  return worker;
}
