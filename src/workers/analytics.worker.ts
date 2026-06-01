import { Worker, type Job } from "bullmq";
import { redisConnection, QUEUE_NAMES, type AnalyticsJobName } from "@/lib/queue";
import { prisma } from "@/lib/db";
import { predictPerformance } from "@/lib/scoring";

/**
 * Analytics worker: recomputes derived data on a schedule or on demand.
 *   - refresh-account: re-pull/refresh a single account's metrics (stub).
 *   - recompute-predictions: refresh PredictivePerformance rows from current data.
 */

interface AnalyticsPayload {
  accountId?: string;
  creatorId?: string;
}

async function handle(job: Job<AnalyticsPayload>): Promise<void> {
  switch (job.name as AnalyticsJobName) {
    case "refresh-account": {
      // TODO(analytics): re-fetch live metrics; here we just touch lastRefreshed.
      if (job.data.accountId) {
        await prisma.platformAccount.update({ where: { id: job.data.accountId }, data: { lastRefreshed: new Date() } });
      }
      break;
    }
    case "recompute-predictions": {
      const creators = await prisma.creator.findMany({
        where: job.data.creatorId ? { id: job.data.creatorId } : undefined,
        include: { accounts: { include: { audienceReport: true }, take: 1, orderBy: { followers: "desc" } } },
        take: 500,
      });
      for (const c of creators) {
        const aq = c.accounts[0]?.audienceReport?.audienceQualityScore ?? 50;
        const p = predictPerformance({ followers: c.followerTotal, engagementRate: c.engagementRate, audienceQualityScore: aq });
        await prisma.predictivePerformance.create({
          data: { creatorId: c.id, expectedReach: p.expectedReach, expectedEngagements: p.expectedEngagements, expectedCpm: p.expectedCpm, confidence: p.confidence },
        });
      }
      break;
    }
  }
}

export function startAnalyticsWorker(): Worker {
  const worker = new Worker<AnalyticsPayload>(QUEUE_NAMES.analytics, handle, {
    connection: redisConnection(),
    concurrency: 3,
  });
  worker.on("failed", (job, err) => console.error(`[analytics] ${job?.name} failed:`, err.message));
  return worker;
}
