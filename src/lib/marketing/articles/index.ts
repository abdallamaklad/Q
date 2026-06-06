/**
 * Registry mapping article slug → rendered body content. Kept separate from the
 * metadata in `insights.ts` (the CMS-ready source of truth) so content and
 * metadata can evolve independently. To add an article: create `<slug>.tsx`
 * exporting `body`, add its metadata to `insights.ts`, and register it here.
 */
import type { ReactNode } from "react";
import { body as aiInfluencerDiscovery2026 } from "./ai-influencer-discovery-2026";
import { body as predictiveCreatorPerformance } from "./predictive-creator-performance";
import { body as influencerFraudDetectionMena } from "./influencer-fraud-detection-mena";
import { body as snapchatCreatorEconomyMena } from "./snapchat-creator-economy-mena";
import { body as influencerAttributionRoi } from "./influencer-attribution-roi";
import { body as microVsMacroInfluencersMena } from "./micro-vs-macro-influencers-mena";
import { body as tiktokAlgorithmMena2026 } from "./tiktok-algorithm-mena-2026";

export const articleBodies: Record<string, ReactNode> = {
  "ai-influencer-discovery-2026": aiInfluencerDiscovery2026,
  "predictive-creator-performance": predictiveCreatorPerformance,
  "influencer-fraud-detection-mena": influencerFraudDetectionMena,
  "snapchat-creator-economy-mena": snapchatCreatorEconomyMena,
  "influencer-attribution-roi": influencerAttributionRoi,
  "micro-vs-macro-influencers-mena": microVsMacroInfluencersMena,
  "tiktok-algorithm-mena-2026": tiktokAlgorithmMena2026,
};
