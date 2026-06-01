import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { Platform } from "@prisma/client";

const schema = z.object({
  platform: z.nativeEnum(Platform),
  url: z.string().url().optional(),
  reach: z.number().int().nonnegative().default(0),
  impressions: z.number().int().nonnegative().default(0),
  likes: z.number().int().nonnegative().default(0),
  comments: z.number().int().nonnegative().default(0),
  shares: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
});

// Log a sponsored post's performance for a campaign creator.
export async function POST(req: Request, { params }: { params: Promise<{ ccId: string }> }) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const { ccId } = await params;
  const cc = await prisma.campaignCreator.findFirst({ where: { id: ccId, campaign: { orgId: ctx.orgId } }, select: { id: true } });
  if (!cc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const post = await prisma.postPerformance.create({ data: { campaignCreatorId: ccId, ...parsed.data } });
  return NextResponse.json({ post });
}
