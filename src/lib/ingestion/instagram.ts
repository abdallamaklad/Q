import { Platform } from "@prisma/client";
import { getLLM } from "@/lib/llm";
import type { ChannelRef, IngestedBundle, SourceConnector } from "./types";

/**
 * Instagram connector.
 *
 * Phase 1 (now): AI-assisted DISCOVERY — the LLM suggests candidate handles for
 * a keyword/niche (no scraping, no aggregator cost). Reuses src/lib/llm.
 *
 * Phase 2 (next): ENRICHMENT via the Instagram Graph API (Business Discovery)
 * to turn each candidate handle into a real profile (followers, recent posts,
 * engagement). That needs a Meta app + IG Business account + token; until it's
 * wired, ingestChannel throws a clear pending error rather than fabricating data.
 *
 * (A vendor-aggregator alternative remains available in src/lib/ingestion/aggregator.)
 */
export class InstagramConnector implements SourceConnector {
  readonly platform = Platform.instagram;

  async discover(query: string, limit: number): Promise<ChannelRef[]> {
    const found = await getLLM().discoverCreators({ keyword: query, platform: "instagram", limit });
    return found.map((c) => ({ externalId: "", handle: c.handle }));
  }

  async ingestChannel(_ref: ChannelRef): Promise<IngestedBundle | null> {
    throw new Error(
      "Instagram enrichment is not wired yet (Graph API pending). AI discovery returns candidate handles; " +
        "the Graph API Business Discovery step (next phase) turns them into real profiles."
    );
  }
}
