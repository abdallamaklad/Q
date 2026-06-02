import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getLLM } from "@/lib/llm";

const schema = z.object({
  platform: z.enum(["instagram", "youtube", "tiktok"]).default("instagram"),
  keyword: z.string().trim().min(2),
  limit: z.coerce.number().int().positive().max(25).default(10),
});

/**
 * AI-assisted discovery: returns candidate creator handles for a keyword/niche
 * via the LLM. These are CANDIDATES — they must be validated/enriched against
 * the platform API (Instagram Graph API enrichment is the next phase). With the
 * offline mock LLM you'll get placeholder handles; set ANTHROPIC_API_KEY for
 * real suggestions.
 */
export async function POST(req: Request) {
  const ctx = await requireApi("admin");
  if (ctx instanceof NextResponse) return ctx;
  const limited = await enforceRateLimit(`discover:${ctx.userId}`, 20, 60);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a keyword (2+ chars)." }, { status: 400 });
  const { platform, keyword, limit } = parsed.data;

  try {
    const llm = getLLM();
    const creators = await llm.discoverCreators({ keyword, platform, limit });
    return NextResponse.json({ creators, llm: llm.name, candidates: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Discovery failed" }, { status: 500 });
  }
}
