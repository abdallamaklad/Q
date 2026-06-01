import { env } from "@/lib/env";
import type { LLMProvider } from "./types";
import { MockLLM } from "./mock";
import { AnthropicLLM } from "./anthropic";

let instance: LLMProvider | null = null;

/**
 * Returns the active LLM provider. Selection is driven by env (see env.llmProvider):
 * defaults to the deterministic MockLLM; uses Anthropic when configured.
 * The rest of the app depends only on the LLMProvider interface.
 */
export function getLLM(): LLMProvider {
  if (instance) return instance;
  instance = env.llmProvider === "anthropic" ? new AnthropicLLM() : new MockLLM();
  return instance;
}

export type { LLMProvider, ParsedSearch } from "./types";
