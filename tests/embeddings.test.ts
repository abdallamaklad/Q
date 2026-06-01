import { describe, it, expect } from "vitest";
import { embedText, cosineSimilarity, centroid, EMBEDDING_DIM, normalize } from "@/lib/embeddings";

describe("embeddings", () => {
  it("produces deterministic vectors of the right dimension", () => {
    const a = embedText("vegan fitness creator in Berlin");
    const b = embedText("vegan fitness creator in Berlin");
    expect(a).toHaveLength(EMBEDDING_DIM);
    expect(a).toEqual(b);
  });

  it("ranks similar text higher than dissimilar text", () => {
    const base = embedText("vegan fitness workouts and plant based recipes");
    const similar = embedText("plant based fitness and vegan recipes");
    const different = embedText("crypto trading and finance news markets");
    expect(cosineSimilarity(base, similar)).toBeGreaterThan(cosineSimilarity(base, different));
  });

  it("normalizes vectors to unit length", () => {
    const v = normalize([3, 4, 0]);
    const len = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(len).toBeCloseTo(1, 6);
  });

  it("centroid of identical vectors equals the (normalized) vector", () => {
    const v = embedText("travel photography");
    const c = centroid([v, v, v]);
    expect(cosineSimilarity(c, v)).toBeCloseTo(1, 5);
  });

  it("empty text yields a zero vector", () => {
    expect(embedText("").every((x) => x === 0)).toBe(true);
  });
});
