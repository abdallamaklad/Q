import { Platform } from "@prisma/client";
import { getAggregator } from "./aggregator";
import { normalizeAggregator } from "./normalize";
import type { ChannelRef, IngestedBundle, SourceConnector } from "./types";

/**
 * Instagram connector via a licensed data aggregator (vendor-agnostic — see
 * src/lib/ingestion/aggregator). Instagram has no free public discovery API, so
 * discovery + metrics come from the configured vendor (AGGREGATOR_VENDOR /
 * AGGREGATOR_API_KEY). Supports keyword discovery AND handle enrichment, and
 * uses real audience demographics when the vendor provides them.
 */
export class InstagramConnector implements SourceConnector {
  readonly platform = Platform.instagram;

  async discover(query: string, limit: number): Promise<ChannelRef[]> {
    const hits = await getAggregator().search(query, this.platform, limit);
    return hits.map((h) => ({ externalId: h.externalId, handle: h.handle }));
  }

  async ingestChannel(ref: ChannelRef): Promise<IngestedBundle | null> {
    const idOrHandle = ref.handle || ref.externalId;
    if (!idOrHandle) return null;
    const creator = await getAggregator().report(idOrHandle, this.platform);
    if (!creator) return null;
    return normalizeAggregator(creator);
  }
}
