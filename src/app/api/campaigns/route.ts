import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;
  const campaigns = await prisma.campaign.findMany({
    where: { orgId: ctx.orgId },
    include: { brand: true, _count: { select: { creators: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ campaigns });
}

const schema = z.object({
  name: z.string().min(1),
  brief: z.string().optional(),
  goal: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  brandId: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Validate brand belongs to org if provided.
  if (parsed.data.brandId) {
    const brand = await prisma.brand.findFirst({ where: { id: parsed.data.brandId, orgId: ctx.orgId } });
    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 400 });
  }

  const campaign = await prisma.campaign.create({
    data: {
      orgId: ctx.orgId,
      name: parsed.data.name,
      brief: parsed.data.brief,
      goal: parsed.data.goal,
      budget: parsed.data.budget ?? 0,
      brandId: parsed.data.brandId,
    },
  });
  return NextResponse.json({ campaign });
}
