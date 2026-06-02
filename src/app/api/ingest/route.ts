import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  platform: z.enum(["youtube", "instagram"]).default("youtube"),
  query: z.string().trim().min(1).optional(),
  handles: z.array(z.string().trim().min(1)).max(50).optional(),
  limit: z.coerce.number().int().positive().max(25).default(10),
});

/**
 * Admin-only ingestion trigger. Enqueues a `discover` job for a keyword and/or
 * one `ingest` job per supplied channel handle/ID. Jobs run in the BullMQ
 * worker (`npm run worker`); results land in the same DB the app reads.
 */
export async function POST(req: Request) {
  const ctx = await requireApi("admin");
  if (ctx instanceof NextResponse) return ctx;
  const limited = await enforceRateLimit(`ingest:${ctx.userId}`, 10, 60);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { platform, query, handles, limit } = parsed.data;

  if (!query && !(handles && handles.length)) {
    return NextResponse.json({ error: "Provide a keyword query and/or channel handles." }, { status: 400 });
  }
  if (platform === "youtube" && !process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY is not configured on the server." }, { status: 400 });
  }
  if (platform === "instagram" && !process.env.AGGREGATOR_API_KEY) {
    return NextResponse.json({ error: "AGGREGATOR_API_KEY is not configured (Instagram needs a data-aggregator key)." }, { status: 400 });
  }
  // Instagram handle entries don't use channel-id semantics; pass them as handles.

  try {
    const { ingestionQueue } = await import("@/lib/queue");
    let queued = 0;
    if (query) {
      await ingestionQueue.add("discover", { platform, query, limit }, { removeOnComplete: true });
      queued++;
    }
    for (const h of handles ?? []) {
      const isChannelId = h.startsWith("UC");
      await ingestionQueue.add(
        "ingest",
        { platform, externalId: isChannelId ? h : "", handle: isChannelId ? undefined : h },
        { removeOnComplete: true, attempts: 2 }
      );
      queued++;
    }
    return NextResponse.json({ ok: true, queued, note: "Ingestion is running in the background. Re-check search/this page shortly." });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to queue ingestion" }, { status: 500 });
  }
}
