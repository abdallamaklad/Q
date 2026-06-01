/**
 * Deterministic mock data generation, shared by the seed script and the
 * IngestionProvider's normalize/score stages. Given the same seed, it always
 * produces the same dataset — so the demo is reproducible.
 */
import { Platform, ContentType } from "@prisma/client";
import {
  fakeFollowerScore,
  audienceQualityScore,
  engagementAnomaly,
  suspectedPod,
  concentration,
  expectedEngagementRate,
} from "@/lib/scoring";
import { embedCreatorText, embedText, type Distribution } from "@/lib/embeddings";

// ── Seedable RNG (mulberry32) ────────────────────────────────────────────────
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const pickN = <T>(rng: Rng, arr: readonly T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  return out;
};
const range = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);
const intRange = (rng: Rng, lo: number, hi: number) => Math.floor(range(rng, lo, hi + 1));

// ── Pools ────────────────────────────────────────────────────────────────────
const FIRST = ["Mia", "Liam", "Noah", "Emma", "Lukas", "Sofia", "Hiro", "Aisha", "Carlos", "Lena", "Yuki", "Omar", "Nina", "Tom", "Clara", "Diego", "Sara", "Max", "Zoe", "Ivan", "Priya", "Jonas", "Amara", "Felix", "Ana", "Kai", "Leila", "Bruno", "Maya", "Ravi"];
const LAST = ["Schmidt", "Garcia", "Tanaka", "Khan", "Rossi", "Müller", "Silva", "Nguyen", "Kowalski", "Andersson", "Okafor", "Dubois", "Costa", "Yilmaz", "Novak", "Reyes", "Haddad", "Berg", "Sato", "Mendez", "Patel", "Weber", "Lopez", "Fischer", "Marino", "Cohen", "Bauer", "Romano", "Singh", "Klein"];

export const CATEGORIES = ["fitness", "vegan", "beauty", "fashion", "gaming", "tech", "travel", "food", "cooking", "lifestyle", "family", "finance", "music", "comedy", "education", "sports", "skincare", "wellness", "photography", "art", "diy", "automotive", "outdoor", "home", "pets", "books", "dance", "real estate"] as const;
export const BASE_COUNTRIES = ["United States", "Germany", "United Kingdom", "France", "Spain", "Italy", "Brazil", "India", "Canada", "Australia", "Japan", "Mexico", "Netherlands", "Sweden", "Poland", "Nigeria", "Indonesia", "Turkey"] as const;
export const MENA_COUNTRIES = ["Algeria", "Bahrain", "Djibouti", "Egypt", "Iran", "Iraq", "Israel", "Jordan", "Kuwait", "Lebanon", "Libya", "Mauritania", "Morocco", "Oman", "Palestine", "Qatar", "Saudi Arabia", "Sudan", "Syria", "Tunisia", "United Arab Emirates", "Yemen"] as const;
export const COUNTRIES = [...BASE_COUNTRIES, ...MENA_COUNTRIES] as const;
const CITIES: Record<string, string[]> = {
  "United States": ["Los Angeles", "New York", "Austin", "Miami"],
  Germany: ["Berlin", "Munich", "Hamburg", "Cologne"],
  "United Kingdom": ["London", "Manchester", "Bristol"],
  France: ["Paris", "Lyon", "Marseille"],
  Japan: ["Tokyo", "Osaka"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi"],
  "Saudi Arabia": ["Riyadh", "Jeddah"],
  Egypt: ["Cairo", "Alexandria"],
  Morocco: ["Casablanca", "Marrakesh"],
};
const LANG_BY_COUNTRY: Record<string, string[]> = {
  "United States": ["English"], Germany: ["German", "English"], "United Kingdom": ["English"],
  France: ["French", "English"], Spain: ["Spanish"], Italy: ["Italian"], Brazil: ["Portuguese"],
  India: ["Hindi", "English"], Japan: ["Japanese"], Mexico: ["Spanish"], Netherlands: ["Dutch", "English"],
  Sweden: ["Swedish", "English"], Poland: ["Polish"], Nigeria: ["English"], Indonesia: ["Indonesian"], Turkey: ["Turkish"],
  Algeria: ["Arabic", "French"], Bahrain: ["Arabic"], Djibouti: ["Arabic", "French"], Egypt: ["Arabic"],
  Iran: ["Persian"], Iraq: ["Arabic"], Israel: ["Hebrew", "Arabic"], Jordan: ["Arabic"], Kuwait: ["Arabic"],
  Lebanon: ["Arabic", "French"], Libya: ["Arabic"], Mauritania: ["Arabic"], Morocco: ["Arabic", "French"],
  Oman: ["Arabic"], Palestine: ["Arabic"], Qatar: ["Arabic"], "Saudi Arabia": ["Arabic"], Sudan: ["Arabic"],
  Syria: ["Arabic"], Tunisia: ["Arabic", "French"], "United Arab Emirates": ["Arabic", "English"], Yemen: ["Arabic"],
};
const INTERESTS = ["fitness", "fashion", "beauty", "travel", "food", "gaming", "tech", "music", "sports", "finance", "family", "wellness", "art", "pets", "home", "real estate"];
const HASHTAGS_BY_CAT: Record<string, string[]> = {
  fitness: ["fitfam", "workout", "gymlife", "fitnessmotivation"],
  vegan: ["vegan", "plantbased", "veganfood", "crueltyfree"],
  beauty: ["makeup", "skincare", "beautytips", "mua"],
  gaming: ["gaming", "twitch", "esports", "gamer"],
  travel: ["wanderlust", "travelgram", "explore", "vanlife"],
  food: ["foodie", "recipe", "homecooking", "yum"],
  tech: ["tech", "gadgets", "ai", "coding"],
  finance: ["finance", "investing", "crypto", "money"],
  family: ["family", "parenting", "momlife", "dadlife"],
  "real estate": ["realestate", "property", "homesforsale", "realtor"],
};
const BRAND_MENTIONS = ["nike", "gymshark", "sephora", "hellofresh", "notion", "shopify", "samsung", "adidas", "lululemon", "oatly"];

const platformsBase: Platform[] = [Platform.instagram, Platform.tiktok, Platform.youtube, Platform.snapchat, Platform.twitch, Platform.facebook, Platform.x, Platform.pinterest];

// ── Generated structures ─────────────────────────────────────────────────────
export interface GeneratedAccount {
  platform: Platform;
  handle: string;
  url: string;
  followers: number;
  engagementRate: number;
  growthRate: number;
  postsCount: number;
  metrics: Record<string, number>;
  history: { date: string; followers: number; engagementRate: number }[];
  audience: {
    ageDistribution: Distribution;
    genderDistribution: Distribution;
    geoDistribution: Distribution;
    interestDistribution: Distribution;
    fakeFollowerScore: number;
    audienceQualityScore: number;
    engagementAnomaly: boolean;
    suspectedPod: boolean;
  };
  content: GeneratedContent[];
}

export interface GeneratedContent {
  platform: Platform;
  type: ContentType;
  caption: string;
  transcript: string | null;
  hashtags: string[];
  mentions: string[];
  metrics: Record<string, number>;
  sentiment: number;
  deepfakeScore: number;
  postedAt: Date;
  embedding: number[];
}

export interface GeneratedCreator {
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  categoryTags: string[];
  location: string;
  country: string;
  languages: string[];
  followerTotal: number;
  engagementRate: number;
  growthRate: number;
  aiGeneratedScore: number;
  verified: boolean;
  embedding: number[];
  accounts: GeneratedAccount[];
}

function normalizeDist(d: Distribution): Distribution {
  const total = Object.values(d).reduce((a, b) => a + b, 0) || 1;
  const out: Distribution = {};
  for (const [k, v] of Object.entries(d)) out[k] = Math.round((v / total) * 1000) / 1000;
  return out;
}

function makeAudience(rng: Rng, followers: number, engagementRate: number, skewGender?: "male" | "female", skewAge?: string, skewCountry?: string) {
  const ageBuckets = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];
  const age: Distribution = {};
  for (const b of ageBuckets) age[b] = range(rng, 0.05, 0.3) + (b === skewAge ? 0.5 : 0);
  const gender: Distribution = {
    male: range(rng, 0.2, 0.6) + (skewGender === "male" ? 0.4 : 0),
    female: range(rng, 0.2, 0.6) + (skewGender === "female" ? 0.4 : 0),
    other: range(rng, 0.01, 0.06),
  };
  const geoCountries: string[] = pickN(rng, COUNTRIES, intRange(rng, 3, 5));
  if (skewCountry && !geoCountries.includes(skewCountry)) geoCountries[0] = skewCountry;
  const geo: Distribution = {};
  for (const c of geoCountries) geo[c] = range(rng, 0.1, 0.5) + (c === skewCountry ? 0.4 : 0);
  const interests: Distribution = {};
  for (const i of pickN(rng, INTERESTS, intRange(rng, 3, 5))) interests[i] = range(rng, 0.1, 0.5);

  const interestDistribution = normalizeDist(interests);
  const commentRatio = range(rng, 0.002, 0.12);
  const likeVarianceRatio = range(rng, 0.03, 0.4);
  const fake = fakeFollowerScore({ followers, engagementRate, avgCommentsToLikesRatio: commentRatio });
  const quality = audienceQualityScore({ fakeFollowerScore: fake, engagementRate, followers, interestConcentration: concentration(interestDistribution) });

  return {
    ageDistribution: normalizeDist(age),
    genderDistribution: normalizeDist(gender),
    geoDistribution: normalizeDist(geo),
    interestDistribution,
    fakeFollowerScore: fake,
    audienceQualityScore: quality,
    engagementAnomaly: engagementAnomaly({ followers, engagementRate }),
    suspectedPod: suspectedPod({ engagementRate, followers, avgCommentsToLikesRatio: commentRatio, likeVarianceRatio }),
  };
}

function makeContent(rng: Rng, platform: Platform, categories: string[], followers: number, engagementRate: number, count: number): GeneratedContent[] {
  const items: GeneratedContent[] = [];
  const typeByPlatform: Record<Platform, ContentType[]> = {
    instagram: [ContentType.image, ContentType.reel, ContentType.story],
    tiktok: [ContentType.video, ContentType.short],
    youtube: [ContentType.video, ContentType.short],
    snapchat: [ContentType.story],
    twitch: [ContentType.stream],
    facebook: [ContentType.post, ContentType.video],
    x: [ContentType.post],
    pinterest: [ContentType.image],
  };
  for (let i = 0; i < count; i++) {
    const cat = pick(rng, categories);
    const tags = (HASHTAGS_BY_CAT[cat] ?? [cat]).slice(0, intRange(rng, 1, 3));
    const mentions = rng() < 0.4 ? pickN(rng, BRAND_MENTIONS, intRange(rng, 1, 2)) : [];
    const baseLikes = Math.round((followers * engagementRate) / 100 * range(rng, 0.6, 1.4));
    const caption = `${cat} ${pick(rng, ["tips", "routine", "haul", "review", "day in my life", "behind the scenes"])} ${tags.map((t) => "#" + t).join(" ")}`;
    items.push({
      platform,
      type: pick(rng, typeByPlatform[platform]),
      caption,
      transcript: platform === Platform.youtube || platform === Platform.tiktok ? `In this video I cover ${cat} ${pick(rng, ["basics", "myths", "favorites"])}.` : null,
      hashtags: tags,
      mentions,
      metrics: {
        likes: baseLikes,
        comments: Math.round(baseLikes * range(rng, 0.003, 0.08)),
        views: Math.round(baseLikes * range(rng, 4, 12)),
        shares: Math.round(baseLikes * range(rng, 0.01, 0.05)),
      },
      sentiment: Math.round(range(rng, -0.2, 0.9) * 100) / 100,
      deepfakeScore: Math.round(range(rng, 0, rng() < 0.05 ? 0.8 : 0.15) * 100) / 100,
      postedAt: new Date(Date.now() - intRange(rng, 1, 240) * 24 * 3600 * 1000),
      embedding: embedText(caption),
    });
  }
  return items;
}

/** Generate one fully-populated creator deterministically from a seed + index. */
export function generateCreator(seed: number, index: number): GeneratedCreator {
  const rng = makeRng(seed + index * 2654435761);
  const first = pick(rng, FIRST);
  const last = pick(rng, LAST);
  const name = `${first} ${last}`;
  const handleBase = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
  const handle = `${handleBase}${intRange(rng, 1, 999)}`;
  const categoryTags = pickN(rng, CATEGORIES, intRange(rng, 1, 3));
  // Weight country selection so MENA is a meaningful minority (~25%) rather than
  // dominating just because the region adds many countries to the pool.
  const country = rng() < 0.25 ? pick(rng, MENA_COUNTRIES) : pick(rng, BASE_COUNTRIES);
  const city = (CITIES[country] ? pick(rng, CITIES[country]) : country);
  const location = CITIES[country] ? `${city}, ${country}` : country;
  const languages = LANG_BY_COUNTRY[country] ?? ["English"];

  // Tier distribution: lots of micro, fewer mega.
  const r = rng();
  const tierFollowers =
    r < 0.55 ? intRange(rng, 1_000, 25_000) :
    r < 0.85 ? intRange(rng, 25_000, 100_000) :
    r < 0.97 ? intRange(rng, 100_000, 800_000) :
    intRange(rng, 800_000, 6_000_000);

  const platformCount = intRange(rng, 1, 3);
  const creatorPlatforms = pickN(rng, platformsBase, platformCount);
  const verified = tierFollowers > 200_000 && rng() < 0.6;
  const aiGeneratedScore = Math.round(range(rng, 0, rng() < 0.06 ? 0.85 : 0.2) * 100) / 100;

  // Possible audience skews so demographic filters return results.
  const skewGender = rng() < 0.5 ? (rng() < 0.5 ? "female" : "male") : undefined;
  const skewAge = rng() < 0.5 ? pick(rng, ["18-24", "25-34", "35-44"]) : undefined;
  const skewCountry = rng() < 0.4 ? country : undefined;

  const accounts: GeneratedAccount[] = creatorPlatforms.map((platform, i) => {
    const share = i === 0 ? range(rng, 0.5, 0.8) : range(rng, 0.1, 0.4);
    const followers = Math.max(500, Math.round(tierFollowers * share));
    const expected = expectedEngagementRate(followers);
    const engagementRate = Math.round(range(rng, expected * 0.4, expected * 1.8) * 100) / 100;
    const growthRate = Math.round(range(rng, -3, 18) * 100) / 100;
    const history = Array.from({ length: 6 }).map((_, m) => ({
      date: new Date(Date.now() - (5 - m) * 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      followers: Math.round(followers * (1 - (growthRate / 100) * (5 - m) * 0.5)),
      engagementRate: Math.round((engagementRate + range(rng, -0.5, 0.5)) * 100) / 100,
    }));
    return {
      platform,
      handle,
      url: `https://${platform}.com/${handle}`,
      followers,
      engagementRate,
      growthRate,
      postsCount: intRange(rng, 30, 1500),
      metrics: { avgLikes: Math.round((followers * engagementRate) / 100), avgViews: Math.round(followers * range(rng, 0.5, 3)) },
      history,
      audience: makeAudience(rng, followers, engagementRate, skewGender, skewAge, skewCountry),
      content: makeContent(rng, platform, categoryTags, followers, engagementRate, intRange(rng, 4, 8)),
    };
  });

  const followerTotal = accounts.reduce((s, a) => s + a.followers, 0);
  const engagementRate = Math.round((accounts.reduce((s, a) => s + a.engagementRate * a.followers, 0) / followerTotal) * 100) / 100;
  const growthRate = Math.round((accounts.reduce((s, a) => s + a.growthRate, 0) / accounts.length) * 100) / 100;
  const bio = `${categoryTags.join(" · ")} creator${location ? ` in ${location}` : ""}. ${pick(rng, ["Sharing my journey.", "Collabs welcome.", "Let's create together.", "DM for partnerships."])}`;
  const topHashtags = categoryTags.flatMap((c) => HASHTAGS_BY_CAT[c] ?? [c]);

  return {
    name,
    handle,
    avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(handle)}`,
    bio,
    categoryTags,
    location,
    country,
    languages,
    followerTotal,
    engagementRate,
    growthRate,
    aiGeneratedScore,
    verified,
    embedding: embedCreatorText({ name, bio, categoryTags, location, languages, topHashtags }),
    accounts,
  };
}
