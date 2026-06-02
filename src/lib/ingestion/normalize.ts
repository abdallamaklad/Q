import { Platform, ContentType } from "@prisma/client";
import {
  fakeFollowerScore,
  audienceQualityScore,
  engagementAnomaly,
  suspectedPod,
  concentration,
} from "@/lib/scoring";
import { embedCreatorText, embedText, type Distribution } from "@/lib/embeddings";
import { makeRng, CATEGORIES } from "@/lib/providers/mock-data";
import { averageSentiment } from "./sentiment";
import type { GeneratedCreator, GeneratedContent } from "@/lib/providers/mock-data";
import type { IngestedBundle } from "./types";
import type { AggregatorCreator } from "./aggregator/types";

// ── Raw YouTube shapes (subset of YouTube Data API v3 responses) ─────────────
export interface RawYouTubeChannel {
  id: string;
  title: string;
  description: string;
  handle?: string; // customUrl, e.g. "@mkbhd"
  country?: string; // ISO-3166 alpha-2, e.g. "US"
  thumbnailUrl?: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export interface RawYouTubeVideo {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  publishedAt: string; // ISO
  viewCount: number;
  likeCount: number;
  commentCount: number;
  topComments?: string[]; // optional, for sentiment
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France", ES: "Spain",
  IT: "Italy", BR: "Brazil", IN: "India", CA: "Canada", AU: "Australia", JP: "Japan",
  MX: "Mexico", NL: "Netherlands", SE: "Sweden", PL: "Poland", NG: "Nigeria", ID: "Indonesia",
  TR: "Turkey", AE: "United Arab Emirates", SA: "Saudi Arabia", EG: "Egypt", MA: "Morocco",
};
const COUNTRY_LANG: Record<string, string[]> = {
  "United States": ["English"], "United Kingdom": ["English"], Germany: ["German", "English"],
  France: ["French"], Spain: ["Spanish"], Brazil: ["Portuguese"], India: ["Hindi", "English"],
  Japan: ["Japanese"], "United Arab Emirates": ["Arabic", "English"], "Saudi Arabia": ["Arabic"],
  Egypt: ["Arabic"], Morocco: ["Arabic", "French"], Turkey: ["Turkish"],
};

function deriveCategories(text: string): string[] {
  const lc = text.toLowerCase();
  // Whole-word match so "art" doesn't tag "artist"/"smart"/"part", etc.
  const hits = CATEGORIES.filter((c) => {
    const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(lc);
  });
  return hits.length ? hits.slice(0, 3) : ["lifestyle"];
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Deterministic estimated audience distributions (flagged estimated downstream). */
function estimateAudience(
  externalId: string,
  country: string,
  interestsSeed: string[],
  followers: number,
  engagementRate: number,
  avgCommentsToLikesRatio: number,
  likeVarianceRatio: number
) {
  // Seed an RNG from the channel id so the same channel always estimates the same.
  let seed = 0;
  for (const ch of externalId) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rng = makeRng(seed);
  const norm = (d: Distribution): Distribution => {
    const total = Object.values(d).reduce((a, b) => a + b, 0) || 1;
    const out: Distribution = {};
    for (const [k, v] of Object.entries(d)) out[k] = Math.round((v / total) * 1000) / 1000;
    return out;
  };

  const ageBuckets = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];
  const age: Distribution = {};
  for (const b of ageBuckets) age[b] = 0.05 + rng() * 0.3;
  const gender: Distribution = { male: 0.3 + rng() * 0.4, female: 0.3 + rng() * 0.4, other: 0.02 + rng() * 0.04 };
  const geo: Distribution = { [country]: 0.4 + rng() * 0.3 };
  for (const c of ["United States", "United Kingdom", "India", "Germany"]) if (!geo[c]) geo[c] = rng() * 0.25;
  const interests: Distribution = {};
  for (const i of interestsSeed.length ? interestsSeed : ["lifestyle"]) interests[i] = 0.2 + rng() * 0.4;

  const interestDistribution = norm(interests);
  const fake = fakeFollowerScore({ followers, engagementRate, avgCommentsToLikesRatio });
  const quality = audienceQualityScore({
    fakeFollowerScore: fake,
    engagementRate,
    followers,
    interestConcentration: concentration(interestDistribution),
  });
  return {
    ageDistribution: norm(age),
    genderDistribution: norm(gender),
    geoDistribution: norm(geo),
    interestDistribution,
    fakeFollowerScore: fake,
    audienceQualityScore: quality,
    engagementAnomaly: engagementAnomaly({ followers, engagementRate }),
    suspectedPod: suspectedPod({ engagementRate, followers, avgCommentsToLikesRatio, likeVarianceRatio }),
  };
}

/** Normalize raw YouTube channel + recent videos into a canonical ingest bundle. */
export function normalizeYouTube(channel: RawYouTubeChannel, videos: RawYouTubeVideo[]): IngestedBundle {
  // ── Real engagement metrics from public video stats ──
  const withViews = videos.filter((v) => v.viewCount > 0);
  const perVideoEng = withViews.map((v) => (v.likeCount + v.commentCount) / v.viewCount);
  const engagementRate = perVideoEng.length
    ? clamp((perVideoEng.reduce((a, b) => a + b, 0) / perVideoEng.length) * 100, 0, 100)
    : 0;
  const commentsToLikes = videos.map((v) => v.commentCount / Math.max(v.likeCount, 1));
  const avgCommentsToLikesRatio = commentsToLikes.length
    ? commentsToLikes.reduce((a, b) => a + b, 0) / commentsToLikes.length
    : 0.02;
  const likes = videos.map((v) => v.likeCount);
  const likeMean = likes.reduce((a, b) => a + b, 0) / Math.max(likes.length, 1);
  const likeVar = likes.length
    ? Math.sqrt(likes.reduce((a, b) => a + (b - likeMean) ** 2, 0) / likes.length) / Math.max(likeMean, 1)
    : 0.2;

  const country = channel.country ? COUNTRY_NAMES[channel.country] ?? channel.country : "United States";
  const languages = COUNTRY_LANG[country] ?? ["English"];
  const categoryTags = deriveCategories(`${channel.title} ${channel.description} ${videos.flatMap((v) => v.tags ?? []).join(" ")}`);
  const handle = (channel.handle ?? channel.title).replace(/^@/, "");

  const content: GeneratedContent[] = videos.map((v) => ({
    platform: Platform.youtube,
    type: ContentType.video,
    caption: v.title,
    transcript: v.description ?? null,
    hashtags: (v.tags ?? []).slice(0, 5).map((t) => t.replace(/\s+/g, "").toLowerCase()),
    mentions: [],
    metrics: { likes: v.likeCount, comments: v.commentCount, views: v.viewCount, shares: 0 },
    sentiment: averageSentiment([...(v.topComments ?? []), v.title]),
    deepfakeScore: 0,
    postedAt: new Date(v.publishedAt),
    embedding: embedText(`${v.title} ${(v.tags ?? []).join(" ")}`),
  }));

  const audience = estimateAudience(
    channel.id, country, categoryTags, channel.subscriberCount, engagementRate, avgCommentsToLikesRatio, likeVar
  );

  const creator: GeneratedCreator = {
    name: channel.title,
    handle,
    avatarUrl: channel.thumbnailUrl ?? `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(handle)}`,
    bio: (channel.description ?? "").slice(0, 280),
    categoryTags,
    location: country,
    country,
    languages,
    followerTotal: channel.subscriberCount,
    engagementRate: Math.round(engagementRate * 100) / 100,
    growthRate: 0, // not available from the public API
    aiGeneratedScore: 0,
    verified: channel.subscriberCount > 100_000,
    embedding: embedCreatorText({ name: channel.title, bio: channel.description, categoryTags, location: country, languages, topHashtags: content.flatMap((c) => c.hashtags) }),
    accounts: [
      {
        platform: Platform.youtube,
        handle,
        url: `https://youtube.com/${channel.handle ?? "channel/" + channel.id}`,
        followers: channel.subscriberCount,
        engagementRate: Math.round(engagementRate * 100) / 100,
        growthRate: 0,
        postsCount: channel.videoCount,
        metrics: { totalViews: channel.viewCount, avgViews: Math.round(channel.viewCount / Math.max(channel.videoCount, 1)) },
        history: [],
        audience,
        content,
      },
    ],
  };

  return {
    source: "youtube",
    externalId: channel.id,
    platform: Platform.youtube,
    audienceEstimated: true,
    creator,
  };
}

function normDist(d: Distribution): Distribution {
  const total = Object.values(d).reduce((a, b) => a + b, 0) || 1;
  const out: Distribution = {};
  for (const [k, v] of Object.entries(d)) out[k] = Math.round((v / total) * 1000) / 1000;
  return out;
}

function contentTypeOf(t?: string): ContentType {
  switch ((t ?? "").toLowerCase()) {
    case "reel": return ContentType.reel;
    case "video": return ContentType.video;
    case "story": return ContentType.story;
    default: return ContentType.image;
  }
}

/**
 * Normalize a vendor-aggregator creator (e.g. Instagram via Modash) into the
 * canonical bundle. Uses REAL audience demographics + fake-follower rate when
 * the vendor provides them (audienceEstimated=false); otherwise estimates and
 * flags it. Engagement/quality come from vendor metrics or scoring.
 */
export function normalizeAggregator(v: AggregatorCreator): IngestedBundle {
  const posts = v.recentPosts ?? [];
  const fromPosts = posts.length
    ? posts.reduce((a, p) => a + p.likes + p.comments, 0) / posts.length / Math.max(v.followers, 1) * 100
    : 0;
  const engagementRate = clamp(v.engagementRate ?? fromPosts, 0, 100);

  const commentsToLikes = posts.length
    ? posts.reduce((a, p) => a + p.comments / Math.max(p.likes, 1), 0) / posts.length
    : 0.03;
  const likeVals = posts.map((p) => p.likes);
  const likeMean = likeVals.reduce((a, b) => a + b, 0) / Math.max(likeVals.length, 1);
  const likeVar = likeVals.length
    ? Math.sqrt(likeVals.reduce((a, b) => a + (b - likeMean) ** 2, 0) / likeVals.length) / Math.max(likeMean, 1)
    : 0.2;

  const country = v.country && v.country.length === 2 ? COUNTRY_NAMES[v.country] ?? v.country : v.country ?? "United States";
  const languages = COUNTRY_LANG[country] ?? ["English"];
  const categoryTags = (v.categories?.length ? v.categories : deriveCategories(`${v.fullName ?? ""} ${v.bio ?? ""}`)).slice(0, 3);

  // Real audience if the vendor supplied demographics; else estimate (flagged).
  const hasReal = Boolean(v.audience && (v.audience.gender || v.audience.age || v.audience.geo));
  let audience;
  let audienceEstimated: boolean;
  if (hasReal) {
    const interests = v.audience!.interests ? normDist(v.audience!.interests) : { [categoryTags[0] ?? "lifestyle"]: 1 };
    const fake = v.fakeFollowerRate != null
      ? Math.round(v.fakeFollowerRate)
      : fakeFollowerScore({ followers: v.followers, engagementRate, avgCommentsToLikesRatio: commentsToLikes });
    audience = {
      ageDistribution: v.audience!.age ? normDist(v.audience!.age) : {},
      genderDistribution: v.audience!.gender ? normDist(v.audience!.gender) : {},
      geoDistribution: v.audience!.geo ? normDist(v.audience!.geo) : {},
      interestDistribution: interests,
      fakeFollowerScore: fake,
      audienceQualityScore: audienceQualityScore({ fakeFollowerScore: fake, engagementRate, followers: v.followers, interestConcentration: concentration(interests) }),
      engagementAnomaly: engagementAnomaly({ followers: v.followers, engagementRate }),
      suspectedPod: suspectedPod({ engagementRate, followers: v.followers, avgCommentsToLikesRatio: commentsToLikes, likeVarianceRatio: likeVar }),
    };
    audienceEstimated = false;
  } else {
    audience = estimateAudience(v.externalId, country, categoryTags, v.followers, engagementRate, commentsToLikes, likeVar);
    if (v.fakeFollowerRate != null) audience.fakeFollowerScore = Math.round(v.fakeFollowerRate);
    audienceEstimated = true;
  }

  const content: GeneratedContent[] = posts.map((p) => ({
    platform: v.platform,
    type: contentTypeOf(p.type),
    caption: p.caption ?? "",
    transcript: null,
    hashtags: (p.hashtags ?? []).slice(0, 5).map((h) => h.replace(/^#/, "").toLowerCase()),
    mentions: (p.mentions ?? []).map((m) => m.replace(/^@/, "").toLowerCase()),
    metrics: { likes: p.likes, comments: p.comments, views: 0, shares: 0 },
    sentiment: averageSentiment([p.caption ?? ""]),
    deepfakeScore: 0,
    postedAt: p.postedAt ? new Date(p.postedAt) : new Date(),
    embedding: embedText(`${p.caption ?? ""} ${(p.hashtags ?? []).join(" ")}`),
  }));

  const handle = v.handle.replace(/^@/, "");
  const creator: GeneratedCreator = {
    name: v.fullName || handle,
    handle,
    avatarUrl: v.avatarUrl ?? `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(handle)}`,
    bio: (v.bio ?? "").slice(0, 280),
    categoryTags,
    location: country,
    country,
    languages,
    followerTotal: v.followers,
    engagementRate: Math.round(engagementRate * 100) / 100,
    growthRate: 0,
    aiGeneratedScore: 0,
    verified: Boolean(v.verified),
    embedding: embedCreatorText({ name: v.fullName ?? handle, bio: v.bio, categoryTags, location: country, languages, topHashtags: content.flatMap((c) => c.hashtags) }),
    accounts: [
      {
        platform: v.platform,
        handle,
        url: `https://www.${v.platform}.com/${handle}`,
        followers: v.followers,
        engagementRate: Math.round(engagementRate * 100) / 100,
        growthRate: 0,
        postsCount: posts.length,
        metrics: { avgLikes: v.avgLikes ?? Math.round(likeMean), avgComments: v.avgComments ?? 0 },
        history: [],
        audience,
        content,
      },
    ],
  };

  return { source: v.platform, externalId: v.externalId, platform: v.platform, audienceEstimated, creator };
}
