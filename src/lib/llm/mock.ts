import type { CreatorFilters } from "@/lib/search/filters";
import { AGE_BUCKETS, GENDERS, PLATFORMS } from "@/lib/search/filters";
import type {
  LLMProvider,
  OutreachInput,
  ParsedSearch,
  ProfileSummaryInput,
  DiscoverInput,
  DiscoveredCreator,
} from "./types";
import { formatCompact, formatPercent } from "@/lib/utils";

/**
 * Deterministic, rule-based LLM. Parses search prompts and generates copy with
 * zero external calls so every AI feature works fully offline. The parsing
 * rules are exercised directly by tests/search-parsing.test.ts.
 */

// Small gazetteer / taxonomy for entity extraction.
const COUNTRIES = [
  "germany", "united states", "usa", "uk", "united kingdom", "france", "spain",
  "italy", "brazil", "india", "canada", "australia", "japan", "mexico",
  "netherlands", "sweden", "poland", "nigeria", "indonesia", "turkey",
  // MENA region
  "algeria", "bahrain", "djibouti", "egypt", "iran", "iraq", "israel", "jordan",
  "kuwait", "lebanon", "libya", "mauritania", "morocco", "oman", "palestine",
  "qatar", "saudi arabia", "uae", "united arab emirates", "sudan", "syria",
  "tunisia", "yemen",
];
const COUNTRY_CANON: Record<string, string> = {
  usa: "United States",
  "united states": "United States",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  uae: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
};
const CATEGORIES = [
  "fitness", "vegan", "beauty", "fashion", "gaming", "tech", "travel", "food",
  "cooking", "lifestyle", "family", "finance", "music", "comedy",
  "education", "sports", "skincare", "wellness", "photography", "art", "diy",
  "automotive", "outdoor", "home", "pets", "books", "dance", "real estate",
];
// Synonyms that map onto a canonical category (e.g. crypto rolls into finance,
// parenting into family).
const CATEGORY_SYNONYMS: Record<string, string> = {
  crypto: "finance",
  cryptocurrency: "finance",
  investing: "finance",
  parenting: "family",
  mom: "family",
  property: "real estate",
  realtor: "real estate",
};
const LANGUAGES = ["english", "german", "french", "spanish", "portuguese", "arabic", "persian", "hebrew", "japanese", "hindi"];

function parseCount(token: string): number | null {
  const m = token.match(/^(\d+(?:\.\d+)?)\s*([kKmM])?$/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (m[2]?.toLowerCase() === "k") n *= 1_000;
  if (m[2]?.toLowerCase() === "m") n *= 1_000_000;
  return Math.round(n);
}

export class MockLLM implements LLMProvider {
  readonly name = "mock-llm";

  async parseSearchPrompt(prompt: string): Promise<ParsedSearch> {
    // Normalize en/em dashes to hyphens so ranges ("10k–50k") and age buckets
    // ("25–34") match regardless of which dash the user typed.
    const text = prompt.toLowerCase().replace(/[–—]/g, "-");
    const filters: Partial<CreatorFilters> = { semantic: prompt.trim() };
    const notes: string[] = [];

    // Platforms
    const platforms = PLATFORMS.filter((p) => text.includes(p));
    if (text.includes("insta")) platforms.push("instagram");
    if (text.includes("yt")) platforms.push("youtube");
    if (platforms.length) {
      filters.platforms = [...new Set(platforms)];
      notes.push(`platforms: ${filters.platforms.join(", ")}`);
    }

    // Follower ranges: "10k-50k followers", "10k to 50k", ">100k", "under 50k", "over 1m"
    const range = text.match(/(\d+(?:\.\d+)?\s*[km]?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?\s*[km]?)\s*(?:followers|subs|subscribers)?/);
    if (range) {
      const lo = parseCount(range[1].replace(/\s/g, ""));
      const hi = parseCount(range[2].replace(/\s/g, ""));
      if (lo != null) filters.followersMin = lo;
      if (hi != null) filters.followersMax = hi;
      if (lo != null || hi != null) notes.push(`followers ${formatCompact(lo)}–${formatCompact(hi)}`);
    } else {
      const over = text.match(/(?:over|more than|>|at least|min(?:imum)?)\s*(\d+(?:\.\d+)?\s*[km]?)\s*(?:followers|subs|subscribers)?/);
      const under = text.match(/(?:under|less than|<|fewer than|max(?:imum)?|below)\s*(\d+(?:\.\d+)?\s*[km]?)\s*(?:followers|subs|subscribers)?/);
      if (over) {
        const n = parseCount(over[1].replace(/\s/g, ""));
        if (n != null) { filters.followersMin = n; notes.push(`followers ≥ ${formatCompact(n)}`); }
      }
      if (under) {
        const n = parseCount(under[1].replace(/\s/g, ""));
        if (n != null) { filters.followersMax = n; notes.push(`followers ≤ ${formatCompact(n)}`); }
      }
    }

    // Engagement: ">5% engagement", "engagement over 5%", "5% engagement"
    const eng = text.match(/(?:>|over|above|min(?:imum)?|at least)?\s*(\d+(?:\.\d+)?)\s*%\s*engagement|engagement\s*(?:>|over|above|of|at least)?\s*(\d+(?:\.\d+)?)\s*%/);
    if (eng) {
      const val = parseFloat(eng[1] ?? eng[2]);
      if (!Number.isNaN(val)) {
        if (/(?:under|below|less than|max|<)\s*\d/.test(text)) filters.engagementMax = val;
        else filters.engagementMin = val;
        notes.push(`engagement ≥ ${formatPercent(val)}`);
      }
    }

    // Growth: "growing", "fast growing", "growth > 10%"
    const growth = text.match(/growth\s*(?:>|over|above|of)?\s*(\d+(?:\.\d+)?)\s*%/);
    if (growth) {
      filters.growthMin = parseFloat(growth[1]);
      notes.push(`growth ≥ ${growth[1]}%`);
    } else if (/(fast[- ]?growing|rising|up[- ]?and[- ]?coming|trending)/.test(text)) {
      filters.growthMin = 5;
      notes.push("growth ≥ 5% (rising)");
    }

    // Categories / keywords (+ synonyms like crypto→finance, parenting→family)
    const cats = new Set(CATEGORIES.filter((c) => text.includes(c)));
    for (const [syn, canon] of Object.entries(CATEGORY_SYNONYMS)) {
      if (new RegExp(`\\b${syn}`).test(text)) cats.add(canon);
    }
    if (cats.size) {
      filters.categories = [...cats];
      notes.push(`categories: ${[...cats].join(", ")}`);
    }

    // Hashtags + mentions
    const hashtags = [...prompt.matchAll(/#(\w+)/g)].map((m) => m[1]);
    if (hashtags.length) { filters.hashtags = hashtags; notes.push(`hashtags: ${hashtags.join(", ")}`); }
    const mentions = [...prompt.matchAll(/@(\w+)/g)].map((m) => m[1]);
    if (mentions.length) { filters.brandMentions = mentions; notes.push(`mentions: ${mentions.join(", ")}`); }

    // Creator location: "in Germany", "based in France"
    const country = COUNTRIES.find((c) => new RegExp(`\\b${c}\\b`).test(text));
    if (country) {
      const canon = COUNTRY_CANON[country] ?? country.replace(/\b\w/g, (l) => l.toUpperCase());
      // Treat as audience geo only if "audience" sits close to the country
      // mention (e.g. "audience in Germany" / "German audience"); otherwise it
      // describes the creator's own location.
      const idx = text.indexOf(country);
      const window = text.slice(Math.max(0, idx - 25), idx + country.length + 25);
      if (window.includes("audience")) {
        filters.audienceCountries = [canon];
        notes.push(`audience country: ${canon}`);
      } else {
        filters.countries = [canon];
        notes.push(`creator country: ${canon}`);
      }
    }

    // Languages
    const langs = LANGUAGES.filter((l) => new RegExp(`\\b${l}[- ]?speaking\\b|\\bin ${l}\\b`).test(text));
    if (langs.length) {
      filters.languages = langs.map((l) => l.replace(/\b\w/g, (c) => c.toUpperCase()));
      notes.push(`languages: ${filters.languages.join(", ")}`);
    }

    // Audience gender + age: "female audience 25-34", "male audience", "audience 18-24"
    const gender = GENDERS.find((g) => new RegExp(`\\b${g}\\s+audience|audience[^.]*\\b${g}\\b`).test(text));
    if (gender) {
      filters.audienceGender = gender;
      filters.audienceGenderMinShare = 0.5;
      notes.push(`audience gender: ${gender} (≥50%)`);
    }
    const ageMatch = AGE_BUCKETS.filter((b) => text.includes(b.replace("+", "")) && text.includes(b.split("-")[0]));
    const explicitAges = AGE_BUCKETS.filter((b) => text.includes(b));
    const ages = explicitAges.length ? explicitAges : ageMatch;
    if (ages.length) {
      filters.audienceAgeBuckets = ages;
      filters.audienceAgeMinShare = 0.3;
      notes.push(`audience age: ${ages.join(", ")} (≥30%)`);
    }

    // Quality gates
    if (/(no fake|real followers|authentic|low fraud)/.test(text)) {
      filters.maxFakeFollowerScore = 25;
      notes.push("max fake-follower score 25");
    }
    if (/verified/.test(text)) { filters.verifiedOnly = true; notes.push("verified only"); }

    return {
      filters,
      interpretation: notes.length ? notes.join(" · ") : "No structured filters detected — using semantic search only.",
    };
  }

  async summarizeProfile(input: ProfileSummaryInput): Promise<string> {
    const tier =
      input.followerTotal >= 1_000_000 ? "mega" :
      input.followerTotal >= 100_000 ? "macro" :
      input.followerTotal >= 10_000 ? "mid-tier" : "micro";
    const health =
      input.audienceQualityScore >= 75 ? "a high-quality, authentic audience" :
      input.audienceQualityScore >= 50 ? "a reasonably healthy audience" :
      "an audience with some quality concerns";
    const fraud = input.fakeFollowerScore > 35
      ? ` Note an elevated fake-follower estimate (${input.fakeFollowerScore}%) worth verifying before outreach.`
      : "";
    const platforms = input.platforms
      .sort((a, b) => b.followers - a.followers)
      .map((p) => `${p.platform} (${formatCompact(p.followers)})`)
      .join(", ");

    return (
      `${input.name} is a ${tier} ${input.categoryTags.slice(0, 2).join(" & ") || "lifestyle"} creator` +
      `${input.location ? ` based in ${input.location}` : ""} with ${formatCompact(input.followerTotal)} total followers ` +
      `across ${platforms}. Engagement runs at ${formatPercent(input.engagementRate)} with ` +
      `${input.growthRate >= 0 ? "+" : ""}${formatPercent(input.growthRate)} monthly growth, backed by ${health} ` +
      `(quality score ${input.audienceQualityScore}/100).${fraud} Audience interests skew toward ` +
      `${input.topInterests.slice(0, 3).join(", ") || "general lifestyle"}.`
    );
  }

  async draftOutreach(input: OutreachInput): Promise<string> {
    const tone = input.tone ?? "friendly";
    const opener =
      tone === "professional" ? `Hi ${input.creatorName},` :
      tone === "playful" ? `Hey ${input.creatorName}! 👋` :
      `Hi ${input.creatorName},`;
    const cat = input.creatorCategories[0] ?? "content";
    return (
      `${opener}\n\n` +
      `I'm reaching out from ${input.brandName} — we've been following your ${cat} content and love how it resonates with your community. ` +
      `We're launching "${input.campaignName}"${input.campaignGoal ? ` to ${input.campaignGoal}` : ""} and think you'd be a fantastic fit.\n\n` +
      `Would you be open to a quick chat about a paid collaboration? Happy to share the brief and discuss rates that work for you.\n\n` +
      `Best,\nThe ${input.brandName} team\n\n` +
      `— Draft generated by Qulture. Review and edit before sending; nothing is sent automatically.`
    );
  }

  async discoverCreators({ keyword, limit }: DiscoverInput): Promise<DiscoveredCreator[]> {
    // Deterministic placeholder handles (offline stand-in). Real discovery uses
    // the Anthropic model; these are clearly synthetic and just keep dev/tests working.
    const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "creator";
    const patterns = [slug, `${slug}.official`, `the.${slug}`, `${slug}daily`, `real.${slug}`, `${slug}hub`, `its.${slug}`, `${slug}.world`, `${slug}.co`, `${slug}.life`];
    return patterns.slice(0, Math.max(0, Math.min(limit, patterns.length))).map((handle, i) => ({ handle, name: `${keyword} creator ${i + 1}` }));
  }

  async draftFollowups(input: OutreachInput, count: number): Promise<string[]> {
    const templates = [
      `Hi ${input.creatorName}, just floating this back to the top of your inbox — still keen to explore "${input.campaignName}" with you. Any thoughts?`,
      `Hey ${input.creatorName}, no pressure at all! If timing isn't right for ${input.brandName} now, I'd love to keep you in mind for future campaigns. Worth a quick call?`,
      `Hi ${input.creatorName}, last note from me on this — we're finalizing our ${input.campaignName} roster this week and would love to include you. Let me know either way!`,
    ];
    return templates.slice(0, Math.max(0, Math.min(count, templates.length)));
  }
}
