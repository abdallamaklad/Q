import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

/**
 * Brand Share of Voice — what share of creator conversation each brand owns,
 * measured from content @mentions. Returns mention counts, reach (distinct
 * creators), engagement, and each brand's % share of both mentions and
 * engagement. Optional filters: ?category=<tag>&since=<ISO date>.
 */
interface Row { brand: string; mentions: number; creators: number; engagement: bigint }

export async function GET(req: Request) {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;
  const limited = await enforceRateLimit(`sov:${ctx.userId}`, 60, 60);
  if (limited) return limited;

  const sp = new URL(req.url).searchParams;
  const category = sp.get("category")?.trim() || null;
  const since = sp.get("since") ? new Date(sp.get("since")!) : null;

  const conds: Prisma.Sql[] = [];
  if (since && !Number.isNaN(since.getTime())) conds.push(Prisma.sql`ci."postedAt" >= ${since}`);
  if (category) {
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM "creators" c WHERE c.id = ci."creatorId" AND c."categoryTags" && ARRAY[${category}]::text[])`);
  }
  const where = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, " AND ")}` : Prisma.empty;

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT m AS brand,
           COUNT(*)::int AS mentions,
           COUNT(DISTINCT ci."creatorId")::int AS creators,
           COALESCE(SUM(COALESCE((ci.metrics->>'likes')::int, 0) + COALESCE((ci.metrics->>'comments')::int, 0)), 0)::bigint AS engagement
    FROM "content_items" ci
    CROSS JOIN LATERAL unnest(ci."mentions") AS m
    ${where}
    GROUP BY m
    ORDER BY mentions DESC`;

  const totalMentions = rows.reduce((s, r) => s + r.mentions, 0) || 1;
  const totalEngagement = rows.reduce((s, r) => s + Number(r.engagement), 0) || 1;

  const brands = rows.map((r) => ({
    brand: r.brand,
    mentions: r.mentions,
    creators: r.creators,
    engagement: Number(r.engagement),
    sharePct: Math.round((r.mentions / totalMentions) * 1000) / 10,
    engagementSharePct: Math.round((Number(r.engagement) / totalEngagement) * 1000) / 10,
  }));

  return NextResponse.json({ brands, totalMentions, totalEngagement });
}
