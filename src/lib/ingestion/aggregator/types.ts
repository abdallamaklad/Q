import type { Platform } from "@prisma/client";
import type { Distribution } from "@/lib/embeddings";

/**
 * Vendor-agnostic aggregator layer. Licensed influencer-data vendors (Modash,
 * HypeAuditor, Phyllo, …) expose IG/TikTok discovery + profile metrics — and,
 * unlike public APIs, often real audience demographics + fake-follower rates.
 * Each vendor implements `AggregatorAdapter`; the rest of the ingestion pipeline
 * is vendor-agnostic. Swap vendors by adding one adapter + setting env.
 */

export interface AggregatorPost {
  caption?: string;
  likes: number;
  comments: number;
  postedAt?: string;
  type?: string; // "image" | "reel" | "video" | …
  hashtags?: string[];
  mentions?: string[];
}

export interface AggregatorCreator {
  externalId: string; // vendor/platform id (stable dedupe key)
  handle: string;
  fullName?: string;
  platform: Platform;
  followers: number;
  engagementRate?: number; // percent, if the vendor provides it
  avgLikes?: number;
  avgComments?: number;
  fakeFollowerRate?: number; // 0-100, if provided (vendor "credibility"/"fake")
  country?: string;
  categories?: string[];
  bio?: string;
  avatarUrl?: string;
  verified?: boolean;
  /** REAL audience demographics when the vendor supplies them (then not estimated). */
  audience?: {
    age?: Distribution;
    gender?: Distribution;
    geo?: Distribution;
    interests?: Distribution;
  };
  recentPosts?: AggregatorPost[];
}

export interface AggregatorSearchHit {
  externalId: string;
  handle: string;
}

export interface AggregatorAdapter {
  readonly vendor: string;
  /** Keyword/topic discovery → creator hits (vendor-side search). */
  search(query: string, platform: Platform, limit: number): Promise<AggregatorSearchHit[]>;
  /** Full profile report by vendor id or handle → normalized creator. */
  report(idOrHandle: string, platform: Platform): Promise<AggregatorCreator | null>;
}
