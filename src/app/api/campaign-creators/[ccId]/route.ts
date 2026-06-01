import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { CampaignStage } from "@prisma/client";

async function ownsCC(orgId: string, ccId: string) {
  return prisma.campaignCreator.findFirst({ where: { id: ccId, campaign: { orgId } }, select: { id: true } });
}

const patchSchema = z.object({
  stage: z.nativeEnum(CampaignStage).optional(),
  rate: z.number().nonnegative().optional(),
  deliverables: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Update a campaign-creator's stage / rate / deliverables / notes.
// When negotiation terms (rate or deliverables) change, append a history entry
// recording the change and the acting user.
export async function PATCH(req: Request, { params }: { params: Promise<{ ccId: string }> }) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const { ccId } = await params;
  if (!(await ownsCC(ctx.orgId, ccId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { stage, rate, deliverables, notes } = parsed.data;

  const existing = await prisma.campaignCreator.findUnique({ where: { id: ccId }, select: { rate: true, deliverables: true } });

  const cc = await prisma.campaignCreator.update({
    where: { id: ccId },
    data: {
      stage,
      rate,
      deliverables: deliverables === undefined ? undefined : deliverables,
      notes: notes ?? undefined,
    },
  });

  // Record negotiation-term history only when rate/deliverables actually change.
  const rateChanged = rate !== undefined && rate !== existing?.rate;
  const delivChanged = deliverables !== undefined && deliverables !== existing?.deliverables;
  if (rateChanged || delivChanged) {
    await prisma.negotiationHistory.create({
      data: { campaignCreatorId: ccId, rate: cc.rate, deliverables: cc.deliverables, changedById: ctx.userId },
    });
  }

  return NextResponse.json({ campaignCreator: cc });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ ccId: string }> }) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const { ccId } = await params;
  if (!(await ownsCC(ctx.orgId, ccId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.campaignCreator.delete({ where: { id: ccId } });
  return NextResponse.json({ ok: true });
}
