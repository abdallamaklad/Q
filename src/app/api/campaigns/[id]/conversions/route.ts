import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ConversionSource } from "@prisma/client";

const schema = z.object({
  campaignCreatorId: z.string().optional(),
  source: z.nativeEnum(ConversionSource).default("manual"),
  type: z.string().min(1),
  value: z.number().nonnegative().default(0),
});

// Manually log a conversion event for a campaign.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, orgId: ctx.orgId }, select: { id: true } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const event = await prisma.conversionEvent.create({ data: { campaignId: id, ...parsed.data } });
  return NextResponse.json({ event });
}
