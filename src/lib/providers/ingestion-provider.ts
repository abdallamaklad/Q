import type { CreatorFilters } from "@/lib/search/filters";
import type {
  AudienceReportDTO,
  ContentItemDTO,
  CreatorDetail,
  CreatorSummary,
  DataProvider,
  SearchResult,
} from "./types";
import { MockProvider } from "./mock-provider";

/**
 * IngestionProvider — serves reads from the Postgres database that the bulk
 * ingestion pipeline upserts into, and triggers (re)ingestion on refresh.
 *
 * Because ingestion normalizes external data into the SAME schema the seed
 * uses, reads are identical to MockProvider — so we delegate them. The
 * difference is refreshAccount(), which enqueues the BullMQ pipeline:
 *
 *     fetch → normalize → score → embed → upsert
 *
 * See src/workers/ingestion.worker.ts for the pipeline skeleton and TODO
 * markers for licensed / first-party data feeds. Set DATA_PROVIDER=ingestion
 * and run `npm run worker` to process jobs.
 */
export class IngestionProvider implements DataProvider {
  readonly name = "ingestion";
  private reads = new MockProvider();

  searchCreators(filters: CreatorFilters): Promise<SearchResult> {
    return this.reads.searchCreators(filters);
  }
  getCreator(id: string): Promise<CreatorDetail | null> {
    return this.reads.getCreator(id);
  }
  getAudienceReport(accountId: string): Promise<AudienceReportDTO | null> {
    return this.reads.getAudienceReport(accountId);
  }
  getContent(accountId: string, limit?: number): Promise<ContentItemDTO[]> {
    return this.reads.getContent(accountId, limit);
  }
  lookalikeByCreators(creatorIds: string[], limit: number): Promise<CreatorSummary[]> {
    return this.reads.lookalikeByCreators(creatorIds, limit);
  }
  lookalikeByBrands(brandIds: string[], limit: number): Promise<CreatorSummary[]> {
    return this.reads.lookalikeByBrands(brandIds, limit);
  }

  async refreshAccount(accountId: string): Promise<{ ok: boolean; message: string }> {
    // Re-ingest this account by its platform-native id. Lazy imports keep BullMQ
    // and Prisma out of the request path unless this provider is active.
    const { prisma } = await import("@/lib/db");
    const account = await prisma.platformAccount.findUnique({
      where: { id: accountId },
      select: { platform: true, externalId: true },
    });
    if (!account) return { ok: false, message: "Account not found" };
    if (!account.externalId) {
      return { ok: false, message: "This account has no external id to re-ingest (e.g. seeded/mock data)." };
    }
    const { ingestionQueue } = await import("@/lib/queue");
    await ingestionQueue.add(
      "ingest",
      { platform: account.platform, externalId: account.externalId },
      { removeOnComplete: true, attempts: 2 }
    );
    return { ok: true, message: `Queued re-ingestion for ${account.platform}.` };
  }
}
