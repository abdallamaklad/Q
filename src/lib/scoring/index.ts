/**
 * Scoring functions for Qulture.
 *
 * All functions here are PURE and deterministic given their inputs, so they
 * are unit-tested directly (see tests/scoring.test.ts) and reused by both the
 * seed script and the live providers. Heuristics are intentionally transparent
 * and documented for later upgrade to learned models.
 */

import { clamp } from "@/lib/utils";

export type Distribution = Record<string, number>;

// ── Fraud: fake-follower score ───────────────────────────────────────────────
/**
 * Estimate the % of followers that are likely fake (0-100). Combines:
 *  - engagement that is implausibly low for the follower count (bought followers)
 *  - very round follower numbers (sign of bulk purchases)
 *  - a baseline noise floor.
 * Higher = worse.
 */
export function fakeFollowerScore(input: {
  followers: number;
  engagementRate: number; // percent
  avgCommentsToLikesRatio?: number; // healthy ≈ 0.01–0.08
}): number {
  const { followers, engagementRate } = input;
  if (followers <= 0) return 0;

  // Expected engagement decays with audience size; below expectation looks fake.
  const expected = expectedEngagementRate(followers);
  const shortfall = clamp((expected - engagementRate) / expected, 0, 1); // 0..1
  let score = shortfall * 70;

  // Comment/like ratio anomaly: pods and bots inflate likes, not comments.
  const ratio = input.avgCommentsToLikesRatio;
  if (ratio != null) {
    if (ratio < 0.004) score += 15; // almost no comments → suspicious
    else if (ratio > 0.25) score += 10; // comment spam / pods
  }

  // Suspiciously round follower counts.
  if (followers >= 10_000 && followers % 1_000 === 0) score += 5;

  return Math.round(clamp(score, 0, 100));
}

/** Typical engagement rate (%) for a given follower count (empirical decay). */
export function expectedEngagementRate(followers: number): number {
  if (followers < 5_000) return 6.0;
  if (followers < 25_000) return 4.5;
  if (followers < 100_000) return 3.2;
  if (followers < 500_000) return 2.2;
  if (followers < 1_000_000) return 1.6;
  return 1.1;
}

// ── Fraud: engagement anomaly + suspected pod ────────────────────────────────
/**
 * Flag accounts whose engagement deviates wildly from the expected band, which
 * suggests bought engagement or coordinated pods.
 */
export function engagementAnomaly(input: { followers: number; engagementRate: number }): boolean {
  const expected = expectedEngagementRate(input.followers);
  // More than 2.5x expected, or a large account with near-zero engagement.
  return input.engagementRate > expected * 2.5 || (input.followers > 50_000 && input.engagementRate < 0.3);
}

/**
 * Suspected engagement-pod indicator: high likes but disproportionately low
 * comments and a spiky (low-variance, high-mean) like pattern.
 */
export function suspectedPod(input: {
  engagementRate: number;
  followers: number;
  avgCommentsToLikesRatio: number;
  likeVarianceRatio: number; // stdev/mean of recent like counts; pods → very low
}): boolean {
  const anomalous = engagementAnomaly(input);
  const lowComments = input.avgCommentsToLikesRatio < 0.005;
  const tooConsistent = input.likeVarianceRatio < 0.08;
  // Two of the three signals → flag.
  return [anomalous, lowComments, tooConsistent].filter(Boolean).length >= 2;
}

// ── Audience quality ─────────────────────────────────────────────────────────
/**
 * Composite 0-100 audience-quality score. Higher = healthier audience.
 * Penalizes fake followers; rewards engagement and interest concentration.
 */
export function audienceQualityScore(input: {
  fakeFollowerScore: number; // 0-100
  engagementRate: number; // percent
  followers: number;
  interestConcentration?: number; // 0..1 (HHI of interest distribution)
}): number {
  const realFollowerFactor = 1 - input.fakeFollowerScore / 100; // 0..1
  const engagementFactor = clamp(input.engagementRate / expectedEngagementRate(input.followers), 0, 2) / 2; // 0..1
  const interestFactor = clamp(input.interestConcentration ?? 0.5, 0, 1);

  const score = (realFollowerFactor * 0.55 + engagementFactor * 0.3 + interestFactor * 0.15) * 100;
  return Math.round(clamp(score, 0, 100));
}

/** Herfindahl concentration index of a distribution (0 = uniform, 1 = single). */
export function concentration(dist: Distribution): number {
  const values = Object.values(dist);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  return values.reduce((acc, v) => acc + (v / total) ** 2, 0);
}

// ── Predictive performance (heuristic-v1) ────────────────────────────────────
/**
 * Simple, transparent estimate of a single sponsored post's performance.
 * Documented baseline meant to be replaced by a learned model later.
 */
export function predictPerformance(input: {
  followers: number;
  engagementRate: number; // percent
  audienceQualityScore: number; // 0-100
}): { expectedReach: number; expectedEngagements: number; expectedCpm: number; confidence: number } {
  const qualityFactor = input.audienceQualityScore / 100; // 0..1
  // Organic reach as a fraction of followers, scaled by audience quality.
  const reachRate = clamp(0.18 + 0.12 * qualityFactor, 0.1, 0.4);
  const expectedReach = Math.round(input.followers * reachRate);
  const expectedEngagements = Math.round(expectedReach * (input.engagementRate / 100));
  // CPM rises with quality and falls with scale (bulk discount).
  const baseCpm = 8 + qualityFactor * 14;
  const scaleDiscount = clamp(1 - Math.log10(Math.max(input.followers, 1000)) / 20, 0.6, 1);
  const expectedCpm = Math.round(baseCpm * scaleDiscount * 100) / 100;
  // Confidence higher for mid-tier creators with quality audiences.
  const confidence = clamp(qualityFactor * 0.8 + (input.followers > 10_000 && input.followers < 500_000 ? 0.2 : 0.05), 0, 1);

  return { expectedReach, expectedEngagements, expectedCpm, confidence: Math.round(confidence * 100) / 100 };
}

// ── Audience overlap ─────────────────────────────────────────────────────────
/**
 * Estimate audience overlap between creators from their geo/interest/age
 * distributions. Returns a 0..1 overlap coefficient (Bhattacharyya-style),
 * plus estimated shared/unique reach using inclusion-exclusion on followers.
 */
export function distributionSimilarity(a: Distribution, b: Distribution): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let bc = 0;
  for (const k of keys) bc += Math.sqrt((a[k] ?? 0) * (b[k] ?? 0));
  return clamp(bc, 0, 1);
}

export function pairwiseOverlap(
  a: { followers: number; geo: Distribution; interests: Distribution; age: Distribution },
  b: { followers: number; geo: Distribution; interests: Distribution; age: Distribution }
): { overlapPct: number; sharedReach: number; uniqueReach: number; combinedReach: number } {
  // Weighted blend of distribution similarities → overlap coefficient.
  const sim =
    distributionSimilarity(a.geo, b.geo) * 0.45 +
    distributionSimilarity(a.interests, b.interests) * 0.4 +
    distributionSimilarity(a.age, b.age) * 0.15;
  const overlap = clamp(sim, 0, 1);

  const smaller = Math.min(a.followers, b.followers);
  const sharedReach = Math.round(smaller * overlap);
  const combinedReach = a.followers + b.followers - sharedReach;
  const uniqueReach = combinedReach - sharedReach;

  return {
    overlapPct: Math.round(overlap * 1000) / 10, // one decimal percent
    sharedReach,
    uniqueReach,
    combinedReach,
  };
}

/** Multi-creator combined unique reach via pairwise overlap approximation. */
export function combinedUniqueReach(
  creators: { followers: number; geo: Distribution; interests: Distribution; age: Distribution }[]
): { combinedReach: number; avgOverlapPct: number } {
  if (creators.length === 0) return { combinedReach: 0, avgOverlapPct: 0 };
  const total = creators.reduce((sum, c) => sum + c.followers, 0);

  let overlapSum = 0;
  let pairs = 0;
  let doubleCounted = 0;
  for (let i = 0; i < creators.length; i++) {
    for (let j = i + 1; j < creators.length; j++) {
      const o = pairwiseOverlap(creators[i], creators[j]);
      overlapSum += o.overlapPct;
      doubleCounted += o.sharedReach;
      pairs++;
    }
  }
  const combinedReach = Math.max(Math.round(total - doubleCounted), Math.max(...creators.map((c) => c.followers)));
  return { combinedReach, avgOverlapPct: pairs ? Math.round((overlapSum / pairs) * 10) / 10 : 0 };
}

// ── CPM / ROI ─────────────────────────────────────────────────────────────────
export function cpm(spend: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return Math.round((spend / impressions) * 1000 * 100) / 100;
}

export function roas(revenue: number, spend: number): number {
  if (spend <= 0) return 0;
  return Math.round((revenue / spend) * 100) / 100;
}
