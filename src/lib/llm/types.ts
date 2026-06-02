import type { CreatorFilters } from "@/lib/search/filters";

/** Structured result of parsing a natural-language search prompt. */
export interface ParsedSearch {
  filters: Partial<CreatorFilters>;
  /** Human-readable notes on how the prompt was interpreted. */
  interpretation: string;
}

export interface ProfileSummaryInput {
  name: string;
  categoryTags: string[];
  location?: string | null;
  followerTotal: number;
  engagementRate: number;
  growthRate: number;
  platforms: { platform: string; followers: number }[];
  topInterests: string[];
  fakeFollowerScore: number;
  audienceQualityScore: number;
}

export interface DiscoverInput {
  keyword: string;
  platform: string; // "instagram" | "youtube" | …
  limit: number;
}

export interface DiscoveredCreator {
  handle: string; // platform handle without a leading @
  name?: string;
}

export interface OutreachInput {
  creatorName: string;
  creatorCategories: string[];
  brandName: string;
  campaignName: string;
  campaignGoal?: string | null;
  tone?: "friendly" | "professional" | "playful";
}

/**
 * Single LLM abstraction used across the app. Two implementations:
 *  - MockLLM       (deterministic, offline, default)
 *  - AnthropicLLM  (real model, used when ANTHROPIC_API_KEY is configured)
 *
 * The rest of the app only depends on this interface.
 */
export interface LLMProvider {
  readonly name: string;
  parseSearchPrompt(prompt: string): Promise<ParsedSearch>;
  summarizeProfile(input: ProfileSummaryInput): Promise<string>;
  draftOutreach(input: OutreachInput): Promise<string>;
  draftFollowups(input: OutreachInput, count: number): Promise<string[]>;
  /**
   * AI-assisted discovery: suggest real creator handles for a keyword/niche.
   * Candidates only — they must be validated/enriched against the platform API
   * (some may be stale or wrong). The mock returns deterministic placeholders.
   */
  discoverCreators(input: DiscoverInput): Promise<DiscoveredCreator[]>;
}
