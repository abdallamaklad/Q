import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { pairwiseOverlap, combinedUniqueReach, type Distribution } from "@/lib/scoring";

const schema = z.object({ creatorIds: z.array(z.string()).min(2).max(5) });

// Compute pairwise audience overlap + combined unique reach for 2–5 creators.
export async function POST(req: Request) {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;
  const limited = await enforceRateLimit(`overlap:${ctx.userId}`, 40, 60);
  if (limited) return limited;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select 2–5 creators" }, { status: 400 });

  const creators = await prisma.creator.findMany({
    where: { id: { in: parsed.data.creatorIds } },
    include: { accounts: { orderBy: { followers: "desc" }, take: 1, include: { audienceReport: true } } },
  });

  const entries = creators.map((c) => {
    const ar = c.accounts[0]?.audienceReport;
    return {
      id: c.id,
      name: c.name,
      handle: c.handle,
      avatarUrl: c.avatarUrl,
      followers: c.followerTotal,
      geo: (ar?.geoDistribution as Distribution) ?? {},
      interests: (ar?.interestDistribution as Distribution) ?? {},
      age: (ar?.ageDistribution as Distribution) ?? {},
    };
  });

  // Pairwise matrix.
  const pairs = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const o = pairwiseOverlap(entries[i], entries[j]);
      pairs.push({ a: entries[i].id, b: entries[j].id, ...o });
    }
  }
  const combined = combinedUniqueReach(entries);

  return NextResponse.json({
    creators: entries.map(({ geo, interests, age, ...rest }) => { void geo; void interests; void age; return rest; }),
    pairs,
    combined,
  });
}
