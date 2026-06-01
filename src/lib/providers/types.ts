import type { CreatorFilters } from "@/lib/search/filters";
import type { Platform } from "@prisma/client";

/**
 * DataProvider — the single seam between Qulture's application/UI layer and the
 * underlying data source. The app NEVER imports a concrete provider; it calls
 * getDataProvider() and depends only on this interface. Implementations:
 *   - MockProvider      → seeded Postgres (default, fully offline)
 *   - ApiProvider       → live platform APIs (stubs + rate limiting)
 *   - IngestionProvider → BullMQ bulk pipeline (fetch→normalize→score→embed→upsert)
 */

export interface PlatformAccountDTO {
  platform: Platform;
  handle: string;
  url: string | null;
  followers: number;
  engagementRate: number;
  growthRate: number;
  postsCount: number;
  lastRefreshed: string;
  history: { date: string; followers: number; engagementRate: number }[];
}

export interface CreatorSummary {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
  categoryTags: string[];
  location: string | null;
  country: string | null;
  languages: string[];
  followerTotal: number;
  engagementRate: number;
  growthRate: number;
  verified: boolean;
  aiGeneratedScore: number;
  platforms: Platform[];
  /** Provenance: "mock" | "youtube" | … (null for legacy seed rows). */
  source?: string | null;
  /** Search relevance score 0..1 when returned from searchCreators. */
  score?: number;
}

export interface CreatorDetail extends CreatorSummary {
  accounts: PlatformAccountDTO[];
}

export interface AudienceReportDTO {
  accountId: string;
  platform: Platform;
  ageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
  geoDistribution: Record<string, number>;
  interestDistribution: Record<string, number>;
  fakeFollowerScore: number;
  audienceQualityScore: number;
  engagementAnomaly: boolean;
  suspectedPod: boolean;
  /** True when demographics are heuristically estimated (e.g. ingested creators). */
  estimated: boolean;
}

export interface ContentItemDTO {
  id: string;
  platform: Platform;
  type: string;
  caption: string | null;
  thumbnailUrl: string | null;
  hashtags: string[];
  mentions: string[];
  metrics: Record<string, number>;
  sentiment: number;
  deepfakeScore: number;
  postedAt: string;
}

export interface SearchResult {
  creators: CreatorSummary[];
  total: number;
  page: number;
  pageSize: number;
  /** How the query was executed (for transparency/debugging in the UI). */
  meta: { usedVectorSearch: boolean; usedFullText: boolean; source: string };
}

export interface DataProvider {
  readonly name: string;
  searchCreators(filters: CreatorFilters): Promise<SearchResult>;
  getCreator(id: string): Promise<CreatorDetail | null>;
  getAudienceReport(accountId: string): Promise<AudienceReportDTO | null>;
  getContent(accountId: string, limit?: number): Promise<ContentItemDTO[]>;
  refreshAccount(accountId: string): Promise<{ ok: boolean; message: string }>;
  /** Nearest-neighbor lookalikes from a set of seed creator ids (vector search). */
  lookalikeByCreators(creatorIds: string[], limit: number): Promise<CreatorSummary[]>;
  /** Nearest-neighbor lookalikes from a set of brand ids (vector search). */
  lookalikeByBrands(brandIds: string[], limit: number): Promise<CreatorSummary[]>;
}

/** Raised by stub providers for not-yet-implemented operations. */
export class NotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(`${provider}.${method} is not implemented yet. See ARCHITECTURE.md to wire a real data source.`);
    this.name = "NotImplementedError";
  }
}
