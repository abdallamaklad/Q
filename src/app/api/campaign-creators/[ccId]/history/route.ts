import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";

// Negotiation-terms history for a campaign creator. By default returns the
// current user's own changes (so "history of this data is available to the
// same user"); pass ?all=1 to see the full team history.
export async function GET(req: Request, { params }: { params: Promise<{ ccId: string }> }) {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;
  const { ccId } = await params;

  const owns = await prisma.campaignCreator.findFirst({ where: { id: ccId, campaign: { orgId: ctx.orgId } }, select: { id: true } });
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const all = new URL(req.url).searchParams.get("all") === "1";
  const history = await prisma.negotiationHistory.findMany({
    where: { campaignCreatorId: ccId, ...(all ? {} : { changedById: ctx.userId }) },
    include: { changedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    history: history.map((h) => ({
      id: h.id,
      rate: h.rate,
      deliverables: h.deliverables,
      changedBy: h.changedBy.name ?? h.changedBy.email,
      createdAt: h.createdAt.toISOString(),
    })),
  });
}
