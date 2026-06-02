import { describe, it, expect } from "vitest";
import { MockLLM } from "@/lib/llm/mock";
import { InstagramConnector } from "@/lib/ingestion/instagram";

const llm = new MockLLM();

describe("MockLLM.discoverCreators", () => {
  it("returns deterministic candidate handles without a leading @", async () => {
    const a = await llm.discoverCreators({ keyword: "vegan fitness", platform: "instagram", limit: 5 });
    const b = await llm.discoverCreators({ keyword: "vegan fitness", platform: "instagram", limit: 5 });
    expect(a).toHaveLength(5);
    expect(a).toEqual(b);
    for (const c of a) expect(c.handle).not.toMatch(/^@/);
  });

  it("respects the limit", async () => {
    expect(await llm.discoverCreators({ keyword: "travel", platform: "instagram", limit: 3 })).toHaveLength(3);
  });
});

describe("InstagramConnector", () => {
  it("discover() returns candidate handle refs via the LLM", async () => {
    const refs = await new InstagramConnector().discover("vegan fitness", 4);
    expect(refs).toHaveLength(4);
    expect(refs[0]).toHaveProperty("handle");
  });

  it("ingestChannel() throws a clear pending error (Graph API not wired yet)", async () => {
    await expect(new InstagramConnector().ingestChannel({ externalId: "", handle: "x" })).rejects.toThrow(/Graph API/);
  });
});
