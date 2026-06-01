import { describe, it, expect } from "vitest";
import { MockLLM } from "@/lib/llm/mock";

const llm = new MockLLM();

describe("MockLLM.parseSearchPrompt", () => {
  it("parses the canonical example prompt", async () => {
    const { filters } = await llm.parseSearchPrompt(
      "vegan fitness creators in Germany, 10k–50k followers, >5% engagement, female audience 25–34"
    );
    expect(filters.categories).toEqual(expect.arrayContaining(["vegan", "fitness"]));
    expect(filters.countries).toEqual(["Germany"]);
    expect(filters.followersMin).toBe(10_000);
    expect(filters.followersMax).toBe(50_000);
    expect(filters.engagementMin).toBe(5);
    expect(filters.audienceGender).toBe("female");
    expect(filters.audienceAgeBuckets).toContain("25-34");
    expect(filters.semantic).toBeTruthy();
  });

  it("handles 'over' / 'under' follower phrasing", async () => {
    const over = await llm.parseSearchPrompt("tech youtubers with over 100k subscribers");
    expect(over.filters.followersMin).toBe(100_000);
    expect(over.filters.platforms).toContain("youtube");

    const under = await llm.parseSearchPrompt("micro creators under 10k followers");
    expect(under.filters.followersMax).toBe(10_000);
  });

  it("extracts hashtags and brand mentions", async () => {
    const { filters } = await llm.parseSearchPrompt("beauty creators using #skincare who mention @sephora");
    expect(filters.hashtags).toContain("skincare");
    expect(filters.brandMentions).toContain("sephora");
    expect(filters.categories).toContain("beauty");
  });

  it("detects engagement maximums and quality intent", async () => {
    const { filters } = await llm.parseSearchPrompt("authentic gaming creators, real followers only");
    expect(filters.maxFakeFollowerScore).toBe(25);
    expect(filters.categories).toContain("gaming");
  });

  it("returns a graceful interpretation when nothing structured is found", async () => {
    const { filters, interpretation } = await llm.parseSearchPrompt("someone cool and inspiring");
    expect(filters.semantic).toBe("someone cool and inspiring");
    expect(interpretation).toMatch(/semantic/i);
  });

  it("treats m suffix as millions", async () => {
    const { filters } = await llm.parseSearchPrompt("mega influencers over 1m followers");
    expect(filters.followersMin).toBe(1_000_000);
  });
});
