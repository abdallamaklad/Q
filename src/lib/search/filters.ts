import { z } from "zod";

/**
 * The single source of truth for creator search filters. Drives:
 *  - the advanced-filter UI
 *  - the DataProvider query layer
 *  - the structured output of the AI prompt parser (LLMProvider.parseSearchPrompt)
 *
 * 50+ filterable dimensions across creator metrics, content, and audience.
 */

export const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "snapchat",
  "twitch",
  "facebook",
  "x",
  "pinterest",
] as const;

export const AGE_BUCKETS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"] as const;
export const GENDERS = ["male", "female", "other"] as const;

export const SORT_FIELDS = [
  "relevance",
  "followers",
  "engagement",
  "growth",
  "audienceQuality",
  "fakeFollowers",
] as const;

export const filtersSchema = z.object({
  // Free-text / semantic
  query: z.string().trim().optional(), // keyword text (FTS)
  semantic: z.string().trim().optional(), // semantic intent (vector search)

  // Platforms
  platforms: z.array(z.enum(PLATFORMS)).optional(),

  // Follower / engagement / growth ranges
  followersMin: z.coerce.number().int().nonnegative().optional(),
  followersMax: z.coerce.number().int().positive().optional(),
  engagementMin: z.coerce.number().min(0).max(100).optional(),
  engagementMax: z.coerce.number().min(0).max(100).optional(),
  growthMin: z.coerce.number().optional(),
  growthMax: z.coerce.number().optional(),

  // Taxonomy
  categories: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  brandMentions: z.array(z.string()).optional(),

  // Geography & language
  countries: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),

  // Audience demographics
  audienceAgeBuckets: z.array(z.enum(AGE_BUCKETS)).optional(),
  audienceAgeMinShare: z.coerce.number().min(0).max(1).optional(), // e.g. 0.3 → ≥30% in selected buckets
  audienceGender: z.enum(GENDERS).optional(),
  audienceGenderMinShare: z.coerce.number().min(0).max(1).optional(),
  audienceCountries: z.array(z.string()).optional(),
  audienceCountryMinShare: z.coerce.number().min(0).max(1).optional(),
  audienceInterests: z.array(z.string()).optional(),
  audienceInterestMinShare: z.coerce.number().min(0).max(1).optional(),

  // Content timeframe
  contentSince: z.string().datetime().optional(),
  contentUntil: z.string().datetime().optional(),

  // Quality / fraud gates
  verifiedOnly: z.boolean().optional(),
  maxFakeFollowerScore: z.coerce.number().min(0).max(100).optional(),
  minAudienceQuality: z.coerce.number().min(0).max(100).optional(),
  excludeSuspectedPods: z.boolean().optional(),
  maxAiGeneratedScore: z.coerce.number().min(0).max(1).optional(),

  // Sort + pagination
  sortBy: z.enum(SORT_FIELDS).default("relevance"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(24),
});

export type CreatorFilters = z.infer<typeof filtersSchema>;

export const EMPTY_FILTERS: CreatorFilters = filtersSchema.parse({});

/** Parse filters from URLSearchParams (arrays are comma-separated). */
export function filtersFromSearchParams(params: URLSearchParams): CreatorFilters {
  const arr = (k: string) => {
    const v = params.get(k);
    return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  };
  const num = (k: string) => (params.get(k) != null && params.get(k) !== "" ? Number(params.get(k)) : undefined);
  const bool = (k: string) => (params.get(k) === "true" ? true : params.get(k) === "false" ? false : undefined);

  return filtersSchema.parse({
    query: params.get("query") ?? undefined,
    semantic: params.get("semantic") ?? undefined,
    platforms: arr("platforms"),
    followersMin: num("followersMin"),
    followersMax: num("followersMax"),
    engagementMin: num("engagementMin"),
    engagementMax: num("engagementMax"),
    growthMin: num("growthMin"),
    growthMax: num("growthMax"),
    categories: arr("categories"),
    keywords: arr("keywords"),
    hashtags: arr("hashtags"),
    brandMentions: arr("brandMentions"),
    countries: arr("countries"),
    locations: arr("locations"),
    languages: arr("languages"),
    audienceAgeBuckets: arr("audienceAgeBuckets"),
    audienceAgeMinShare: num("audienceAgeMinShare"),
    audienceGender: params.get("audienceGender") ?? undefined,
    audienceGenderMinShare: num("audienceGenderMinShare"),
    audienceCountries: arr("audienceCountries"),
    audienceCountryMinShare: num("audienceCountryMinShare"),
    audienceInterests: arr("audienceInterests"),
    audienceInterestMinShare: num("audienceInterestMinShare"),
    contentSince: params.get("contentSince") ?? undefined,
    contentUntil: params.get("contentUntil") ?? undefined,
    verifiedOnly: bool("verifiedOnly"),
    maxFakeFollowerScore: num("maxFakeFollowerScore"),
    minAudienceQuality: num("minAudienceQuality"),
    excludeSuspectedPods: bool("excludeSuspectedPods"),
    maxAiGeneratedScore: num("maxAiGeneratedScore"),
    sortBy: params.get("sortBy") ?? undefined,
    sortDir: params.get("sortDir") ?? undefined,
    page: num("page"),
    pageSize: num("pageSize"),
  });
}

/** Serialize filters to a query string, omitting empty values. */
export function filtersToSearchParams(filters: Partial<CreatorFilters>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) sp.set(key, value.join(","));
    } else {
      sp.set(key, String(value));
    }
  }
  return sp.toString();
}
