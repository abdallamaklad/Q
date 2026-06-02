import { Platform } from "@prisma/client";
import { NotImplementedError } from "@/lib/providers/types";
import { YouTubeConnector } from "./youtube";
import { InstagramConnector } from "./instagram";
import type { SourceConnector } from "./types";

/**
 * Returns a live source connector for a platform.
 *  - youtube → real YouTube Data API v3 (needs YOUTUBE_API_KEY)
 *  - instagram/tiktok/… → not yet available via official APIs (app review + no
 *    discovery). Wire a licensed aggregator or CSV import here behind this same
 *    SourceConnector interface — the rest of the pipeline is platform-agnostic.
 */
export function getConnector(platform: Platform): SourceConnector {
  switch (platform) {
    case Platform.youtube: {
      const key = process.env.YOUTUBE_API_KEY;
      if (!key) throw new Error("YOUTUBE_API_KEY is not configured.");
      return new YouTubeConnector(key);
    }
    case Platform.instagram: {
      if (!process.env.AGGREGATOR_API_KEY) throw new Error("AGGREGATOR_API_KEY is not configured (Instagram via aggregator).");
      return new InstagramConnector();
    }
    default:
      throw new NotImplementedError("ingestion", `connector:${platform}`);
  }
}

export type { SourceConnector, IngestedBundle, ChannelRef } from "./types";
export { upsertCreatorBundle } from "./upsert";
