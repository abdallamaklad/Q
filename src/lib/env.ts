/**
 * Central, typed access to environment configuration. Keeps `process.env`
 * lookups in one place and provides safe defaults for local development.
 * No secret values are ever hard-coded here.
 */

export type DataProviderKind = "mock" | "api" | "ingestion";
export type LLMProviderKind = "mock" | "anthropic";

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",

  get dataProvider(): DataProviderKind {
    const v = (process.env.DATA_PROVIDER ?? "mock").toLowerCase();
    return v === "api" || v === "ingestion" ? v : "mock";
  },

  get llmProvider(): LLMProviderKind {
    const explicit = (process.env.LLM_PROVIDER ?? "").toLowerCase();
    if (explicit === "anthropic") return "anthropic";
    if (explicit === "mock") return "mock";
    // If a key is present and no explicit choice, prefer the real model.
    return process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock";
  },

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
} as const;
