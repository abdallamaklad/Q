import type { CreatorFilters } from "@/lib/search/filters";
import type {
  AudienceReportDTO,
  ContentItemDTO,
  CreatorDetail,
  CreatorSummary,
  DataProvider,
  SearchResult,
} from "./types";
import { NotImplementedError } from "./types";
import { platformBuckets } from "./rate-limiter";

/**
 * ApiProvider — wires Qulture to official platform APIs. Shipped as documented
 * stubs: the integration points, rate-limit handling, and required env vars are
 * defined, but live HTTP calls are intentionally left as TODOs because each
 * platform requires app review / approved API access.
 *
 * Required environment (see .env.example):
 *   YOUTUBE_API_KEY            — YouTube Data API v3
 *   TIKTOK_CLIENT_KEY/SECRET   — TikTok Display API
 *   INSTAGRAM_ACCESS_TOKEN     — Instagram Graph API (business accounts)
 *   X_BEARER_TOKEN             — X API v2
 *   TWITCH_CLIENT_ID/SECRET    — Twitch Helix
 *
 * To enable: set DATA_PROVIDER=api and implement the marked fetch calls,
 * normalizing responses into the same DTOs the MockProvider returns.
 */
export class ApiProvider implements DataProvider {
  readonly name = "api";

  /** Example of how rate limiting wraps an outbound call. */
  private async guarded<T>(platform: string, fn: () => Promise<T>): Promise<T> {
    const bucket = platformBuckets[platform];
    if (bucket) {
      const ok = await bucket.acquire();
      if (!ok) throw new Error(`Rate limit exceeded for ${platform}; retry later.`);
    }
    return fn();
  }

  async searchCreators(_filters: CreatorFilters): Promise<SearchResult> {
    // TODO(api): platform discovery/search endpoints + normalization.
    // Most platforms do not offer broad creator search; production search is
    // typically served from ingested data (see IngestionProvider).
    void this.guarded;
    throw new NotImplementedError(this.name, "searchCreators");
  }

  async getCreator(_id: string): Promise<CreatorDetail | null> {
    // TODO(api): fetch channel/user by id across configured platforms.
    throw new NotImplementedError(this.name, "getCreator");
  }

  async getAudienceReport(_accountId: string): Promise<AudienceReportDTO | null> {
    // TODO(api): audience insights (requires owner-authorized Graph/Insights access).
    throw new NotImplementedError(this.name, "getAudienceReport");
  }

  async getContent(_accountId: string, _limit?: number): Promise<ContentItemDTO[]> {
    // TODO(api): list recent media/videos via platform API, then normalize.
    throw new NotImplementedError(this.name, "getContent");
  }

  async refreshAccount(_accountId: string): Promise<{ ok: boolean; message: string }> {
    // TODO(api): re-fetch live metrics for the account, respecting rate limits.
    throw new NotImplementedError(this.name, "refreshAccount");
  }

  async lookalikeByCreators(_creatorIds: string[], _limit: number): Promise<CreatorSummary[]> {
    throw new NotImplementedError(this.name, "lookalikeByCreators");
  }

  async lookalikeByBrands(_brandIds: string[], _limit: number): Promise<CreatorSummary[]> {
    throw new NotImplementedError(this.name, "lookalikeByBrands");
  }
}
