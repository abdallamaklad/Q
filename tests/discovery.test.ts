import { describe, it, expect } from "vitest";
import { MockLLM } from "@/lib/llm/mock";
import { InstagramConnector } from "@/lib/ingestion/instagram";
import { parseDiscovered } from "@/lib/llm/anthropic";

const llm = new MockLLM();

describe("parseDiscovered (tolerant LLM JSON parse)", () => {
  it("parses clean JSON", () => {
    const out = parseDiscovered('[{"handle":"@nimai_delgado","name":"Nimai"},{"handle":"torrewashington"}]', 10);
    expect(out.map((c) => c.handle)).toEqual(["nimai_delgado", "torrewashington"]); // @ stripped
  });

  it("salvages valid entries when one is malformed (unescaped quote)", () => {
    // The exact kind of glitch the model produced live.
    const text = '[\n{"handle":"nimai_delgado","name":"Nimai"},\n{"handle":"theveganp"sychologist","name":"x"},\n{"handle":"karaharms","name":"Kara"}\n]';
    const out = parseDiscovered(text, 10).map((c) => c.handle);
    expect(out).toContain("nimai_delgado");
    expect(out).toContain("karaharms"); // not lost despite the malformed middle entry
  });

  it("dedupes and caps at limit", () => {
    const out = parseDiscovered('[{"handle":"a"},{"handle":"a"},{"handle":"b"},{"handle":"c"}]', 2);
    expect(out).toHaveLength(2);
  });
});

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
