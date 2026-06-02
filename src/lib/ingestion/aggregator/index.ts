import { ModashAdapter } from "./modash";
import type { AggregatorAdapter } from "./types";

/**
 * Returns the configured aggregator adapter. Vendor is chosen via env:
 *   AGGREGATOR_VENDOR  = "modash" (default) | … (add adapters here)
 *   AGGREGATOR_API_KEY = the vendor API token
 * Add a new vendor by implementing AggregatorAdapter and registering it below.
 */
export function getAggregator(): AggregatorAdapter {
  const vendor = (process.env.AGGREGATOR_VENDOR ?? "modash").toLowerCase();
  const key = process.env.AGGREGATOR_API_KEY ?? "";
  switch (vendor) {
    case "modash":
      return new ModashAdapter(key);
    default:
      throw new Error(`Unknown AGGREGATOR_VENDOR "${vendor}". Implement an adapter for it.`);
  }
}

export type { AggregatorAdapter, AggregatorCreator, AggregatorSearchHit, AggregatorPost } from "./types";
