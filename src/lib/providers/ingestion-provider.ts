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
    // Enqueue the ingestion pipeline for this account. Lazy import keeps BullMQ
    // out of the request path unless this provider is active.
    const { ingestionQueue } = await import("@/lib/queue");
    await ingestionQueue.add("fetch", { accountId, stage: "fetch" }, { removeOnComplete: true });
    return { ok: true, message: "Queued ingestion pipeline (fetch → normalize → score → embed → upsert)." };
  }
}
