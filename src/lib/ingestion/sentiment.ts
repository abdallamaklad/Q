/**
 * Tiny, offline, deterministic lexicon sentiment. Used to score comment/caption
 * tone for ingested content without external API/LLM cost. Returns -1..1.
 *
 * Intentionally simple (not a substitute for a real model) — handles negation
 * and basic intensity, good enough for an at-a-glance signal. Swappable later.
 */
const POSITIVE = new Set([
  "love", "loved", "great", "amazing", "awesome", "best", "good", "nice", "perfect",
  "beautiful", "fire", "goat", "incredible", "helpful", "inspiring", "fav", "favorite",
  "obsessed", "wow", "excellent", "fantastic", "brilliant", "thanks", "thank", "winning",
  "clean", "smooth", "wholesome", "underrated", "legend", "queen", "king", "🔥", "❤️", "😍",
]);
const NEGATIVE = new Set([
  "hate", "hated", "bad", "worst", "boring", "trash", "cringe", "fake", "scam", "annoying",
  "terrible", "awful", "disappointing", "overrated", "spam", "bot", "clickbait", "stop",
  "ugly", "waste", "useless", "broken", "lame", "flop", "mid", "ratio", "💀", "👎",
]);
const NEGATIONS = new Set(["not", "no", "never", "dont", "don't", "didnt", "didn't", "isnt", "isn't", "cant", "can't"]);

function scoreText(text: string): number {
  const tokens = text.toLowerCase().replace(/[^a-z0-9'#@À-￿ ]/gi, " ").split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  let score = 0;
  let hits = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    let v = 0;
    if (POSITIVE.has(t)) v = 1;
    else if (NEGATIVE.has(t)) v = -1;
    if (v !== 0) {
      const negated = i > 0 && NEGATIONS.has(tokens[i - 1]);
      score += negated ? -v : v;
      hits++;
    }
  }
  if (hits === 0) return 0;
  return Math.max(-1, Math.min(1, score / Math.max(hits, 3)));
}

/** Average sentiment across a set of texts (comments/captions), rounded to 2dp. */
export function averageSentiment(texts: string[]): number {
  const scored = texts.map(scoreText).filter((s) => s !== 0);
  if (scored.length === 0) return 0;
  const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
  return Math.round(avg * 100) / 100;
}

export { scoreText as sentimentOf };
