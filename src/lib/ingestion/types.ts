import type { Platform } from "@prisma/client";
import type { GeneratedCreator } from "@/lib/providers/mock-data";

/**
 * Canonical ingested bundle. We reuse the exact shape the seed builds
 * (GeneratedCreator → creator + accounts + audience + content), so the upsert
 * stage is identical whether data comes from the seed or a live source.
 * Extra ingestion-only provenance fields live alongside it.
 */
export interface IngestedBundle {
  /** Provenance written to creators.source (e.g. "youtube"). */
  source: string;
  /** Platform-native id used for idempotent dedupe (creators.platform_accounts.externalId). */
  externalId: string;
  platform: Platform;
  /** Audience demographics are heuristically estimated (no public API exposes them). */
  audienceEstimated: boolean;
  creator: GeneratedCreator;
}

/** A discovered channel reference before full enrichment. */
export interface ChannelRef {
  externalId: string; // e.g. YouTube channelId
  handle?: string;
}

/**
 * A platform source connector. YouTube is the first live implementation;
 * Instagram/TikTok throw NotImplemented until an aggregator/app-review path is
 * available (see index.ts). Implementations should be testable offline by
 * accepting an injectable fetch.
 */
export interface SourceConnector {
  readonly platform: Platform;
  /** Keyword discovery → channel refs (may be empty if the source has no search). */
  discover(query: string, limit: number): Promise<ChannelRef[]>;
  /** Fully enrich one channel (by external id or handle) into a canonical bundle. */
  ingestChannel(ref: ChannelRef): Promise<IngestedBundle | null>;
}
