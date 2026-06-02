import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { filtersSchema } from "@/lib/search/filters";
import type {
  LLMProvider,
  OutreachInput,
  ParsedSearch,
  ProfileSummaryInput,
  DiscoverInput,
  DiscoveredCreator,
} from "./types";
import { MockLLM } from "./mock";

/**
 * Real Anthropic-backed LLM. Used when ANTHROPIC_API_KEY is configured. It
 * mirrors the MockLLM interface exactly and falls back to the mock on any
 * error so the app never breaks because of an API hiccup.
 */
export class AnthropicLLM implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;
  private fallback = new MockLLM();

  constructor() {
    this.client = new Anthropic({ apiKey: env.anthropicApiKey });
    this.model = env.anthropicModel;
  }

  async parseSearchPrompt(prompt: string): Promise<ParsedSearch> {
    try {
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text:
              "You convert an influencer-search request into a JSON filter object for the Qulture platform. " +
              "Respond ONLY with a JSON object matching this shape (omit unknown fields): " +
              "{filters: {platforms?, followersMin?, followersMax?, engagementMin?, categories?, hashtags?, " +
              "countries?, languages?, audienceGender?, audienceGenderMinShare?, audienceAgeBuckets?, " +
              "audienceAgeMinShare?, audienceCountries?, verifiedOnly?, semantic?}, interpretation: string}. " +
              "audienceAgeBuckets uses: 13-17,18-24,25-34,35-44,45-54,55+. Always set semantic to the original prompt.",
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: prompt }],
      });
      const block = msg.content.find((b) => b.type === "text");
      const raw = block && "text" in block ? block.text : "{}";
      const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
      const filters = filtersSchema.partial().parse(json.filters ?? {});
      return { filters, interpretation: String(json.interpretation ?? "Parsed by Anthropic.") };
    } catch {
      return this.fallback.parseSearchPrompt(prompt);
    }
  }

  async summarizeProfile(input: ProfileSummaryInput): Promise<string> {
    try {
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: 400,
        system: "You write concise, factual 2-3 sentence influencer profile summaries for a brand analyst.",
        messages: [{ role: "user", content: `Summarize this creator for outreach:\n${JSON.stringify(input)}` }],
      });
      const block = msg.content.find((b) => b.type === "text");
      return block && "text" in block ? block.text : this.fallback.summarizeProfile(input);
    } catch {
      return this.fallback.summarizeProfile(input);
    }
  }

  async draftOutreach(input: OutreachInput): Promise<string> {
    try {
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: 600,
        system:
          "You draft warm, personalized first-touch outreach from a brand to a creator. " +
          "Never claim the message was sent. End with a note that it is a draft for review.",
        messages: [{ role: "user", content: JSON.stringify(input) }],
      });
      const block = msg.content.find((b) => b.type === "text");
      return block && "text" in block ? block.text : this.fallback.draftOutreach(input);
    } catch {
      return this.fallback.draftOutreach(input);
    }
  }

  async draftFollowups(input: OutreachInput, count: number): Promise<string[]> {
    try {
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: 800,
        system: `Write ${count} short, escalating follow-up messages as a JSON array of strings. No preamble.`,
        messages: [{ role: "user", content: JSON.stringify(input) }],
      });
      const block = msg.content.find((b) => b.type === "text");
      const text = block && "text" in block ? block.text : "[]";
      const arr = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
      return Array.isArray(arr) ? arr.map(String).slice(0, count) : this.fallback.draftFollowups(input, count);
    } catch {
      return this.fallback.draftFollowups(input, count);
    }
  }

  async discoverCreators(input: DiscoverInput): Promise<DiscoveredCreator[]> {
    try {
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system:
          "You suggest REAL, currently-active creator accounts for a given platform and niche. " +
          "Output ONLY a JSON array of objects {handle, name}, where handle is the account username " +
          "WITHOUT a leading @. Do not invent or guess accounts you are unsure exist. No prose.",
        messages: [
          { role: "user", content: `Platform: ${input.platform}. Niche/keyword: "${input.keyword}". List up to ${input.limit} well-known creators.` },
        ],
      });
      const block = msg.content.find((b) => b.type === "text");
      const text = block && "text" in block ? block.text : "[]";
      const arr = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
      if (!Array.isArray(arr)) return this.fallback.discoverCreators(input);
      const seen = new Set<string>();
      return arr
        .map((x: { handle?: string; name?: string }) => ({ handle: String(x?.handle ?? "").replace(/^@/, "").trim(), name: x?.name }))
        .filter((c) => c.handle && !seen.has(c.handle.toLowerCase()) && seen.add(c.handle.toLowerCase()))
        .slice(0, input.limit);
    } catch {
      return this.fallback.discoverCreators(input);
    }
  }
}
