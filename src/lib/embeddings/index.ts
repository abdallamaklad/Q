/**
 * Deterministic, dependency-free text embedder.
 *
 * Produces a normalized 384-dim vector from text using a hashed bag-of-words
 * (feature hashing). It is fully deterministic and offline, so seeded data and
 * runtime queries share the same vector space — good enough to demonstrate
 * semantic search, lookalikes, and similarity ranking.
 *
 * TODO(real-embeddings): swap this for a real embedding model (e.g. Anthropic
 * embeddings, Voyage, or a local sentence-transformer) behind this same
 * function signature. Keep the dimension in sync with the `vector(N)` columns.
 */

export const EMBEDDING_DIM = 384;

export type Distribution = Record<string, number>;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "at",
  "by", "from", "is", "are", "be", "this", "that", "it", "as", "i",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s#@]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// FNV-1a 32-bit hash for stable, fast token hashing.
function hash(token: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Embed arbitrary text into a normalized EMBEDDING_DIM vector. */
export function embedText(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIM).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vec;

  for (const token of tokens) {
    const h = hash(token);
    const idx = h % EMBEDDING_DIM;
    // Sign bit derived from a second hash to spread features and reduce collisions.
    const sign = (hash(token + "#s") & 1) === 0 ? 1 : -1;
    vec[idx] += sign;
    // Add a bigram-ish second feature for a touch more resolution.
    const idx2 = (h >>> 9) % EMBEDDING_DIM;
    vec[idx2] += sign * 0.5;
  }

  return normalize(vec);
}

/** Embed a creator-like entity from its descriptive fields. */
export function embedCreatorText(fields: {
  name?: string;
  bio?: string | null;
  categoryTags?: string[];
  location?: string | null;
  languages?: string[];
  topHashtags?: string[];
}): number[] {
  const parts = [
    fields.name ?? "",
    fields.bio ?? "",
    (fields.categoryTags ?? []).join(" "),
    fields.location ?? "",
    (fields.languages ?? []).join(" "),
    (fields.topHashtags ?? []).join(" "),
  ];
  return embedText(parts.join(" "));
}

export function normalize(vec: number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/** Cosine similarity for two equal-length vectors (assumes finite numbers). */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Average several vectors into a single centroid (then normalize). */
export function centroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return new Array(EMBEDDING_DIM).fill(0);
  const sum = new Array<number>(EMBEDDING_DIM).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < EMBEDDING_DIM; i++) sum[i] += v[i] ?? 0;
  }
  return normalize(sum.map((s) => s / vectors.length));
}

/** Format a JS number[] as a pgvector literal: "[0.1,0.2,...]". */
export function toPgVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
