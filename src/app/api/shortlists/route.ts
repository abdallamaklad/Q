import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;
  const shortlists = await prisma.shortlist.findMany({
    where: { orgId: ctx.orgId },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ shortlists });
}

const createSchema = z.object({
  name: z.string().min(1),
  notes: z.string().optional(),
  creatorIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const shortlist = await prisma.shortlist.create({
    data: {
      orgId: ctx.orgId,
      name: parsed.data.name,
      notes: parsed.data.notes,
      items: parsed.data.creatorIds?.length
        ? { create: parsed.data.creatorIds.map((creatorId) => ({ creatorId })) }
        : undefined,
    },
  });
  return NextResponse.json({ shortlist });
}
