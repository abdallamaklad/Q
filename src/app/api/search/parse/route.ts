import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getLLM } from "@/lib/llm";

// Parse a natural-language search prompt into structured filters via the LLM.
export async function POST(req: Request) {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;
  // LLM calls are the most expensive path — keep this tight.
  const limited = await enforceRateLimit(`parse:${ctx.userId}`, 30, 60);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  if (!prompt.trim()) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });

  const parsed = await getLLM().parseSearchPrompt(prompt);
  return NextResponse.json({ ...parsed, llm: getLLM().name });
}
