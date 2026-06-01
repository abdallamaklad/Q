import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";

const addSchema = z.object({ creatorIds: z.array(z.string()).min(1) });

async function ownsCampaign(orgId: string, id: string) {
  return Boolean(await prisma.campaign.findFirst({ where: { id, orgId }, select: { id: true } }));
}

// Add creators to a campaign (defaults to the "contacted" stage).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!(await ownsCampaign(ctx.orgId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.campaignCreator.createMany({
    data: parsed.data.creatorIds.map((creatorId) => ({ campaignId: id, creatorId })),
    skipDuplicates: true,
  });
  return NextResponse.json({ ok: true });
}
