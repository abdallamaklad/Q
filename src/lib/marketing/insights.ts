/**
 * Insights article data — CMS-ready. Today this is a static array; swapping it
 * for a CMS/DB fetch later only means changing how `articles` is sourced. The
 * UI (featured block, filter pills, grid) reads from these exports.
 */

export type InsightCategory = "AI & Tech" | "Platforms" | "Trust & Fraud" | "Strategy" | "Measurement";

export type Accent = "brand" | "heat" | "data" | "gold";

export type Article = {
  slug: string;
  title: string;
  category: InsightCategory;
  readMin: number;
  excerpt: string;
  accent: Accent;
  /** CSS gradient for the card's cover band. */
  cover: string;
};

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
    slug: "predictive-performance",
    title: "Predictive performance: forecasting a creator's reach before you book",
    category: "AI & Tech",
    readMin: 6,
    excerpt: "Why historical engagement is a lagging indicator — and how trajectory modeling changes the math.",
    accent: "brand",
    cover: "linear-gradient(135deg, rgba(155,92,255,0.25), rgba(7,7,15,0.6))",
  },
  {
    slug: "fraud-frontier",
    title: "Engagement pods, bots, and deepfakes: the new fraud frontier",
    category: "Trust & Fraud",
    readMin: 5,
    excerpt: "Fake followers were just the start. What audience-quality scoring catches that the eye can't.",
    accent: "heat",
    cover: "linear-gradient(135deg, rgba(255,70,204,0.22), rgba(7,7,15,0.6))",
  },
  {
    slug: "snapchat-creator-economy",
    title: "Snapchat's creator economy is quietly maturing — here's why it matters",
    category: "Platforms",
    readMin: 7,
    excerpt: "The platform everyone underweights, and the data gap most discovery tools still ignore.",
    accent: "data",
    cover: "linear-gradient(135deg, rgba(34,212,238,0.20), rgba(7,7,15,0.6))",
  },
  {
    slug: "closed-loop-attribution",
    title: "Closed-loop attribution: tying creator spend to actual revenue",
    category: "Measurement",
    readMin: 8,
    excerpt: "Moving past CPM and impressions to the metric that actually matters — revenue per creator.",
    accent: "gold",
    cover: "linear-gradient(135deg, rgba(255,186,69,0.20), rgba(7,7,15,0.6))",
  },
  {
    slug: "micro-vs-macro",
    title: "Micro vs. macro: why one right creator beats fifty wrong ones",
    category: "Strategy",
    readMin: 5,
    excerpt: "Reach is cheap. Relevance compounds. The case for precision over volume in 2026.",
    accent: "brand",
    cover: "linear-gradient(135deg, rgba(155,92,255,0.2), rgba(7,7,15,0.6))",
  },
  {
    slug: "tiktok-algorithm-2026",
    title: "TikTok's algorithm shifts: what brands should watch in 2026",
    category: "Platforms",
    readMin: 6,
    excerpt: "Search-led discovery, longer formats, and what it means for creator selection.",
    accent: "heat",
    cover: "linear-gradient(135deg, rgba(255,70,204,0.18), rgba(34,212,238,0.12))",
  },
];
