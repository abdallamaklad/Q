import { describe, it, expect } from "vitest";
import { normalizeAggregator } from "@/lib/ingestion/normalize";
import { ModashAdapter } from "@/lib/ingestion/aggregator/modash";
import type { AggregatorCreator } from "@/lib/ingestion/aggregator/types";

const withRealAudience: AggregatorCreator = {
  externalId: "ig_123",
  handle: "@hudabeauty",
  fullName: "Huda Kattan",
  platform: "instagram",
  followers: 50_000_000,
  engagementRate: 1.2,
  fakeFollowerRate: 18,
  country: "AE",
  categories: ["beauty", "fashion"],
  bio: "beauty mogul",
  avatarUrl: "https://example.com/h.jpg",
  verified: true,
  audience: {
    gender: { female: 0.78, male: 0.2, other: 0.02 },
    age: { "18-24": 0.4, "25-34": 0.45, "35-44": 0.15 },
    geo: { "United States": 0.3, "United Arab Emirates": 0.25, India: 0.2 },
    interests: { beauty: 0.6, fashion: 0.4 },
  },
  recentPosts: [
    { caption: "new palette drop, love it", likes: 600_000, comments: 8_000, type: "image", hashtags: ["#makeup"], postedAt: "2026-05-01T00:00:00Z" },
    { caption: "tutorial", likes: 500_000, comments: 6_000, type: "reel" },
  ],
};

describe("normalizeAggregator (Instagram)", () => {
  it("uses REAL audience demographics when the vendor provides them (not estimated)", () => {
    const b = normalizeAggregator(withRealAudience);
    expect(b.platform).toBe("instagram");
    expect(b.source).toBe("instagram");
    expect(b.externalId).toBe("ig_123");
    expect(b.audienceEstimated).toBe(false);
    const a = b.creator.accounts[0].audience;
    expect(a.genderDistribution.female).toBeCloseTo(0.78, 2);
    expect(a.fakeFollowerScore).toBe(18); // vendor-provided
    expect(a.audienceQualityScore).toBeGreaterThanOrEqual(0);
    expect(b.creator.accounts[0].content).toHaveLength(2);
    expect(b.creator.accounts[0].content[1].type).toBe("reel");
    expect(b.creator.verified).toBe(true);
    expect(b.creator.country).toBe("United Arab Emirates"); // AE → mapped
  });

  it("estimates + flags audience when the vendor omits demographics", () => {
    const b = normalizeAggregator({ ...withRealAudience, audience: undefined, fakeFollowerRate: undefined });
    expect(b.audienceEstimated).toBe(true);
    expect(b.creator.accounts[0].audience.fakeFollowerScore).toBeGreaterThanOrEqual(0);
  });

  it("derives engagement from posts when not provided", () => {
    const b = normalizeAggregator({ ...withRealAudience, engagementRate: undefined });
    expect(b.creator.engagementRate).toBeGreaterThan(0);
  });
});

describe("ModashAdapter (offline, injected fetch)", () => {
  it("parses a search response into hits", async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ results: [{ userId: "u1", profile: { username: "natgeo", followers: 280000000 } }] }), {
        status: 200, headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;
    const hits = await new ModashAdapter("k", fakeFetch).search("travel", "instagram", 5);
    expect(hits[0]).toEqual({ externalId: "u1", handle: "natgeo" });
  });

  it("parses a report into an AggregatorCreator with audience", async () => {
    const payload = {
      profile: { userId: "u1", username: "natgeo", fullname: "National Geographic", followers: 280000000, engagementRate: 0.005, isVerified: true, picture: "x", country: "US" },
      audience: { genders: [{ code: "male", weight: 0.6 }, { code: "female", weight: 0.4 }], ages: [{ code: "25-34", weight: 0.5 }], geoCountries: [{ name: "United States", weight: 0.3 }], credibility: 0.9 },
    };
    const fakeFetch = (async () =>
      new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
    const c = await new ModashAdapter("k", fakeFetch).report("@natgeo", "instagram");
    expect(c?.handle).toBe("natgeo");
    expect(c?.followers).toBe(280000000);
    expect(c?.fakeFollowerRate).toBe(10); // (1 - 0.9) * 100
    expect(c?.audience?.gender?.male).toBe(0.6);
    expect(c?.verified).toBe(true);
  });

  it("throws without an API key", () => {
    expect(() => new ModashAdapter("")).toThrow();
  });
});
