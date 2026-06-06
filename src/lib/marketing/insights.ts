/**
 * Insights article data — CMS-ready single source of truth. Today this is a
 * static array; swapping it for a CMS/DB fetch later only means changing how
 * `articles` is sourced. The Insights index (featured block + filter grid), the
 * article pages, their metadata, JSON-LD, and OG images all read from here.
 */

export type InsightCategory = "AI & Tech" | "Platforms" | "Trust & Fraud" | "Strategy" | "Measurement";

export type Accent = "brand" | "heat" | "data" | "gold";

export type Article = {
  slug: string;
  title: string;
  category: InsightCategory;
  accent: Accent;
  /** CSS gradient for the card's cover band. */
  cover: string;
  /** Card/teaser summary. */
  excerpt: string;
  /** Reading time in minutes. */
  readMin: number;
  /** Drives the Insights featured block (exactly one article). */
  featured?: boolean;
  /** ISO date — datePublished. */
  date: string;
  /** ISO date — dateModified (defaults to `date`). */
  updated?: string;
  /** ~55–60 chars, primary keyword first, ends " | Qulture". */
  seoTitle: string;
  /** ~150–160 chars, includes primary keyword + a reason to click. */
  seoDescription: string;
  /** Target keywords (MENA-focused). */
  keywords: string[];
  /** 2–3 related slugs for internal linking. */
  related: string[];
};

/** Production origin — used for canonical URLs, OG/JSON-LD absolute links. */
export const SITE_URL = "https://qulture.tech";

/** Maps an accent token to its brand CSS variable. */
export const accentVar: Record<Accent, string> = {
  brand: "var(--brand)",
  heat: "var(--heat)",
  data: "var(--data)",
  gold: "var(--gold)",
};

/** Filter pills, in display order. "All" is the default. */
export const filterCategories: ("All" | InsightCategory)[] = [
  "All",
  "AI & Tech",
  "Platforms",
  "Trust & Fraud",
  "Strategy",
  "Measurement",
];

export const articles: Article[] = [
  {
    slug: "ai-influencer-discovery-2026",
    title: "How AI is rewriting influencer discovery in 2026",
    category: "AI & Tech",
    accent: "brand",
    cover: "linear-gradient(135deg, rgba(155,92,255,0.22), rgba(255,70,204,0.12))",
    excerpt:
      "Natural-language search, predictive performance, and synthetic-creator detection are collapsing a multi-week workflow into minutes. What's actually changing — and what's hype.",
    readMin: 7,
    featured: true,
    date: "2026-01-28",
    seoTitle: "AI Influencer Discovery in 2026 | Qulture",
    seoDescription:
      "AI influencer discovery is reshaping how MENA brands find creators. See how natural-language search and predictive scoring replace weeks of manual work in 2026.",
    keywords: ["AI influencer discovery", "influencer marketing platform MENA", "creator discovery Middle East"],
    related: ["predictive-creator-performance", "influencer-fraud-detection-mena", "micro-vs-macro-influencers-mena"],
  },
  {
    slug: "predictive-creator-performance",
    title: "Predictive performance: forecasting a creator's reach before you book",
    category: "AI & Tech",
    accent: "brand",
    cover: "linear-gradient(135deg, rgba(155,92,255,0.25), rgba(7,7,15,0.6))",
    excerpt: "Why historical engagement is a lagging indicator — and how trajectory modeling changes the math.",
    readMin: 6,
    date: "2026-01-22",
    seoTitle: "Influencer Performance Prediction Guide | Qulture",
    seoDescription:
      "Influencer performance prediction helps UAE brands forecast reach and ROI before booking. Learn to plan Ramadan campaigns with trajectory modeling, not guesswork.",
    keywords: ["influencer performance prediction", "influencer ROI UAE", "Ramadan campaign planning"],
    related: ["ai-influencer-discovery-2026", "influencer-attribution-roi", "micro-vs-macro-influencers-mena"],
  },
  {
    slug: "influencer-fraud-detection-mena",
    title: "Engagement pods, bots & deepfakes: the new influencer fraud frontier",
    category: "Trust & Fraud",
    accent: "heat",
    cover: "linear-gradient(135deg, rgba(255,70,204,0.22), rgba(7,7,15,0.6))",
    excerpt: "Fake followers were just the start. What audience-quality scoring catches that the eye can't.",
    readMin: 6,
    date: "2026-01-18",
    seoTitle: "Influencer Fraud Detection in MENA | Qulture",
    seoDescription:
      "Fake followers detection is now table stakes. See how audience-quality scoring exposes pods, bots, and deepfakes for influencer fraud-wary brands across MENA.",
    keywords: ["fake followers detection", "influencer fraud MENA", "audience quality scoring"],
    related: ["ai-influencer-discovery-2026", "micro-vs-macro-influencers-mena", "influencer-attribution-roi"],
  },
  {
    slug: "snapchat-creator-economy-mena",
    title: "Snapchat's creator economy is quietly maturing — why MENA brands can't ignore it",
    category: "Platforms",
    accent: "data",
    cover: "linear-gradient(135deg, rgba(34,212,238,0.20), rgba(7,7,15,0.6))",
    excerpt: "The platform everyone underweights, and the data gap most discovery tools still ignore.",
    readMin: 7,
    date: "2026-01-14",
    seoTitle: "Snapchat Creator Economy in MENA | Qulture",
    seoDescription:
      "Snapchat influencers in Saudi Arabia drive real reach the rest of the world overlooks. Why the Snapchat creator economy matters for Gulf creators and MENA brands.",
    keywords: ["Snapchat influencers Saudi Arabia", "Snapchat creator economy MENA", "Gulf creators"],
    related: ["tiktok-algorithm-mena-2026", "micro-vs-macro-influencers-mena", "ai-influencer-discovery-2026"],
  },
  {
    slug: "influencer-attribution-roi",
    title: "Closed-loop attribution: tying creator spend to real revenue",
    category: "Measurement",
    accent: "gold",
    cover: "linear-gradient(135deg, rgba(255,186,69,0.20), rgba(7,7,15,0.6))",
    excerpt: "Moving past CPM and impressions to the metric that actually matters — revenue per creator.",
    readMin: 8,
    date: "2026-01-10",
    seoTitle: "Influencer Marketing ROI & Attribution | Qulture",
    seoDescription:
      "Influencer marketing ROI lives or dies on attribution. A practical guide for MENA e-commerce and D2C Gulf brands tying creator spend to real revenue.",
    keywords: ["influencer marketing ROI", "attribution", "MENA e-commerce", "D2C Gulf"],
    related: ["predictive-creator-performance", "micro-vs-macro-influencers-mena", "influencer-fraud-detection-mena"],
  },
  {
    slug: "micro-vs-macro-influencers-mena",
    title: "Micro vs. macro: why one right creator beats fifty wrong ones",
    category: "Strategy",
    accent: "brand",
    cover: "linear-gradient(135deg, rgba(155,92,255,0.2), rgba(7,7,15,0.6))",
    excerpt: "Reach is cheap. Relevance compounds. The case for precision over volume in 2026.",
    readMin: 5,
    date: "2026-01-06",
    seoTitle: "Micro vs Macro Influencers in MENA | Qulture",
    seoDescription:
      "Micro influencers in MENA often beat big names on trust and ROI. When nano influencers in the Gulf and niche Arabic creators win — and how to choose.",
    keywords: ["micro influencers MENA", "nano influencers Gulf", "niche Arabic creators"],
    related: ["ai-influencer-discovery-2026", "influencer-attribution-roi", "predictive-creator-performance"],
  },
  {
    slug: "tiktok-algorithm-mena-2026",
    title: "TikTok's algorithm shifts: what MENA brands should watch in 2026",
    category: "Platforms",
    accent: "heat",
    cover: "linear-gradient(135deg, rgba(255,70,204,0.18), rgba(34,212,238,0.12))",
    excerpt: "Search-led discovery, longer formats, and what it means for creator selection.",
    readMin: 6,
    date: "2026-01-02",
    seoTitle: "TikTok Algorithm Shifts for MENA in 2026 | Qulture",
    seoDescription:
      "TikTok marketing in MENA is changing fast. Search-led discovery, longer formats, and Arabic short-form content trends Middle East brands should watch in 2026.",
    keywords: ["TikTok marketing MENA", "TikTok trends Middle East", "Arabic short-form content"],
    related: ["snapchat-creator-economy-mena", "ai-influencer-discovery-2026", "micro-vs-macro-influencers-mena"],
  },
];

/** Look up a single article by slug. */
export const getArticle = (slug: string): Article | undefined => articles.find((a) => a.slug === slug);

/** The single featured article (drives the Insights hero block). */
export const featuredArticle: Article = articles.find((a) => a.featured) ?? articles[0];

/** Non-featured articles — the filterable Insights grid. */
export const gridArticles: Article[] = articles.filter((a) => !a.featured);

/** Resolve related-article slugs to full articles (filters out any misses). */
export const relatedArticles = (slug: string): Article[] => {
  const a = getArticle(slug);
  if (!a) return [];
  return a.related.map(getArticle).filter((x): x is Article => Boolean(x));
};

/** Human-readable reading time, e.g. "6 min read". */
export const readingTime = (a: Article): string => `${a.readMin} min read`;

/** Formatted publish date, e.g. "28 January 2026". */
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
