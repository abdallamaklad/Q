import { env } from "@/lib/env";
import type { DataProvider } from "./types";
import { MockProvider } from "./mock-provider";
import { ApiProvider } from "./api-provider";
import { IngestionProvider } from "./ingestion-provider";

let instance: DataProvider | null = null;

/**
 * Returns the active DataProvider, selected by the DATA_PROVIDER env var.
 * This is the ONLY place the app learns which data source is live.
 */
export function getDataProvider(): DataProvider {
  if (instance) return instance;
  switch (env.dataProvider) {
    case "api":
      instance = new ApiProvider();
      break;
    case "ingestion":
      instance = new IngestionProvider();
      break;
    default:
      instance = new MockProvider();
  }
  return instance;
}

export type {
  DataProvider,
  CreatorSummary,
  CreatorDetail,
  AudienceReportDTO,
  ContentItemDTO,
  SearchResult,
  PlatformAccountDTO,
} from "./types";
