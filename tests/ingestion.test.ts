import { describe, it, expect } from "vitest";
import { normalizeYouTube, type RawYouTubeChannel, type RawYouTubeVideo } from "@/lib/ingestion/normalize";
import { averageSentiment, sentimentOf } from "@/lib/ingestion/sentiment";
import { YouTubeConnector } from "@/lib/ingestion/youtube";

const channel: RawYouTubeChannel = {
  id: "UCtest123",
  title: "Plant Power Fitness",
  description: "vegan fitness and plant based cooking for everyday athletes",
  handle: "@plantpower",
  country: "DE",
  thumbnailUrl: "https://example.com/avatar.jpg",
  subscriberCount: 250_000,
  viewCount: 40_000_000,
  videoCount: 320,
};
const videos: RawYouTubeVideo[] = [
  { id: "v1", title: "10 vegan high-protein meals", tags: ["vegan", "fitness"], publishedAt: "2026-05-01T00:00:00Z", viewCount: 100_000, likeCount: 8_000, commentCount: 600 },
  { id: "v2", title: "My full day of eating", tags: ["vegan"], publishedAt: "2026-05-10T00:00:00Z", viewCount: 80_000, likeCount: 6_000, commentCount: 400, topComments: ["love this", "so helpful", "amazing recipes"] },
];

describe("normalizeYouTube", () => {
  it("maps a channel + videos into a canonical, estimated-flagged bundle", () => {
    const b = normalizeYouTube(channel, videos);
    expect(b.source).toBe("youtube");
    expect(b.platform).toBe("youtube");
    expect(b.externalId).toBe("UCtest123");
    expect(b.audienceEstimated).toBe(true);

    const c = b.creator;
    expect(c.followerTotal).toBe(250_000);          // real subs
    expect(c.engagementRate).toBeGreaterThan(0);    // real ((likes+comments)/views) avg
    expect(c.engagementRate).toBeLessThan(100);
    expect(c.growthRate).toBe(0);                   // unavailable from public API
    expect(c.country).toBe("Germany");              // DE → mapped
    expect(c.categoryTags).toEqual(expect.arrayContaining(["vegan", "fitness"]));
    expect(c.accounts).toHaveLength(1);
    expect(c.accounts[0].platform).toBe("youtube");
    expect(c.accounts[0].content).toHaveLength(2);
    expect(c.embedding).toHaveLength(384);
  });

  it("computes real fraud/quality scores in 0..100 and flags audience estimated", () => {
    const a = normalizeYouTube(channel, videos).creator.accounts[0].audience;
    expect(a.fakeFollowerScore).toBeGreaterThanOrEqual(0);
    expect(a.fakeFollowerScore).toBeLessThanOrEqual(100);
    expect(a.audienceQualityScore).toBeGreaterThanOrEqual(0);
    expect(a.audienceQualityScore).toBeLessThanOrEqual(100);
    // deterministic estimate: same channel id → same distributions
    const again = normalizeYouTube(channel, videos).creator.accounts[0].audience;
    expect(again.genderDistribution).toEqual(a.genderDistribution);
  });

  it("handles a channel with no videos", () => {
    const b = normalizeYouTube(channel, []);
    expect(b.creator.engagementRate).toBe(0);
    expect(b.creator.accounts[0].content).toHaveLength(0);
  });
});

describe("sentiment", () => {
  it("scores positive/negative/neutral and handles negation", () => {
    expect(sentimentOf("this is amazing and helpful")).toBeGreaterThan(0);
    expect(sentimentOf("worst trash ever, total scam")).toBeLessThan(0);
    expect(sentimentOf("the video is about cooking")).toBe(0);
    expect(sentimentOf("not good")).toBeLessThan(0);
  });
  it("averages across texts, ignoring neutral", () => {
    expect(averageSentiment(["love it", "amazing", "ok"])).toBeGreaterThan(0);
    expect(averageSentiment([])).toBe(0);
  });
});

describe("YouTubeConnector (offline, injected fetch)", () => {
  it("discover parses channel ids from search.list", async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ items: [{ id: { channelId: "UCaaa" } }, { id: { channelId: "UCbbb" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;
    const yt = new YouTubeConnector("test-key", fakeFetch);
    const refs = await yt.discover("vegan fitness", 5);
    expect(refs.map((r) => r.externalId)).toEqual(["UCaaa", "UCbbb"]);
  });

  it("throws without an API key", () => {
    expect(() => new YouTubeConnector("")).toThrow();
  });
});
