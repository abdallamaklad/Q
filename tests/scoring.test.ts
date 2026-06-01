import { describe, it, expect } from "vitest";
import {
  fakeFollowerScore,
  expectedEngagementRate,
  engagementAnomaly,
  suspectedPod,
  audienceQualityScore,
  predictPerformance,
  pairwiseOverlap,
  combinedUniqueReach,
  distributionSimilarity,
  concentration,
  cpm,
  roas,
} from "@/lib/scoring";

describe("fakeFollowerScore", () => {
  it("is low for healthy engagement", () => {
    const s = fakeFollowerScore({ followers: 20_000, engagementRate: 5, avgCommentsToLikesRatio: 0.03 });
    expect(s).toBeLessThan(30);
  });
  it("is high when engagement is far below expectation", () => {
    const s = fakeFollowerScore({ followers: 500_000, engagementRate: 0.2, avgCommentsToLikesRatio: 0.001 });
    expect(s).toBeGreaterThan(50);
  });
  it("is bounded 0..100", () => {
    expect(fakeFollowerScore({ followers: 0, engagementRate: 0 })).toBe(0);
    expect(fakeFollowerScore({ followers: 1_000_000, engagementRate: 0 })).toBeLessThanOrEqual(100);
  });
});

describe("expectedEngagementRate", () => {
  it("decreases as followers grow", () => {
    expect(expectedEngagementRate(1_000)).toBeGreaterThan(expectedEngagementRate(1_000_000));
  });
});

describe("engagementAnomaly & suspectedPod", () => {
  it("flags absurdly high engagement", () => {
    expect(engagementAnomaly({ followers: 100_000, engagementRate: 30 })).toBe(true);
  });
  it("does not flag normal engagement", () => {
    expect(engagementAnomaly({ followers: 100_000, engagementRate: 3 })).toBe(false);
  });
  it("flags pods on combined signals", () => {
    expect(
      suspectedPod({ followers: 100_000, engagementRate: 12, avgCommentsToLikesRatio: 0.001, likeVarianceRatio: 0.02 })
    ).toBe(true);
  });
});

describe("audienceQualityScore", () => {
  it("rewards low fraud and good engagement", () => {
    const good = audienceQualityScore({ fakeFollowerScore: 5, engagementRate: 5, followers: 20_000, interestConcentration: 0.5 });
    const bad = audienceQualityScore({ fakeFollowerScore: 80, engagementRate: 0.3, followers: 20_000, interestConcentration: 0.2 });
    expect(good).toBeGreaterThan(bad);
    expect(good).toBeLessThanOrEqual(100);
    expect(bad).toBeGreaterThanOrEqual(0);
  });
});

describe("predictPerformance", () => {
  it("scales reach with followers and returns bounded confidence", () => {
    const p = predictPerformance({ followers: 50_000, engagementRate: 4, audienceQualityScore: 70 });
    expect(p.expectedReach).toBeGreaterThan(0);
    expect(p.expectedReach).toBeLessThan(50_000);
    expect(p.confidence).toBeGreaterThan(0);
    expect(p.confidence).toBeLessThanOrEqual(1);
    expect(p.expectedCpm).toBeGreaterThan(0);
  });
});

describe("overlap", () => {
  const geoA = { Germany: 0.6, France: 0.4 };
  const geoB = { Germany: 0.5, Spain: 0.5 };
  const flat = { "18-24": 0.5, "25-34": 0.5 };

  it("distributionSimilarity is 1 for identical and lower for disjoint", () => {
    expect(distributionSimilarity(geoA, geoA)).toBeCloseTo(1, 5);
    expect(distributionSimilarity({ a: 1 }, { b: 1 })).toBe(0);
  });

  it("pairwiseOverlap returns shared + combined reach", () => {
    const o = pairwiseOverlap(
      { followers: 10_000, geo: geoA, interests: flat, age: flat },
      { followers: 20_000, geo: geoB, interests: flat, age: flat }
    );
    expect(o.overlapPct).toBeGreaterThan(0);
    expect(o.sharedReach).toBeLessThanOrEqual(10_000);
    expect(o.combinedReach).toBeLessThanOrEqual(30_000);
  });

  it("combinedUniqueReach never exceeds the sum and is at least the largest", () => {
    const creators = [
      { followers: 10_000, geo: geoA, interests: flat, age: flat },
      { followers: 20_000, geo: geoB, interests: flat, age: flat },
      { followers: 5_000, geo: geoA, interests: flat, age: flat },
    ];
    const { combinedReach } = combinedUniqueReach(creators);
    expect(combinedReach).toBeLessThanOrEqual(35_000);
    expect(combinedReach).toBeGreaterThanOrEqual(20_000);
  });
});

describe("concentration / cpm / roas", () => {
  it("concentration is higher for concentrated distributions", () => {
    expect(concentration({ a: 1 })).toBeGreaterThan(concentration({ a: 0.25, b: 0.25, c: 0.25, d: 0.25 }));
  });
  it("cpm and roas compute correctly", () => {
    expect(cpm(1000, 500_000)).toBe(2);
    expect(roas(5000, 1000)).toBe(5);
    expect(cpm(100, 0)).toBe(0);
    expect(roas(100, 0)).toBe(0);
  });
});
