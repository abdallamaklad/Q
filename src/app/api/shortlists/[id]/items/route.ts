import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";

async function ownsShortlist(orgId: string, id: string) {
  const s = await prisma.shortlist.findFirst({ where: { id, orgId }, select: { id: true } });
  return Boolean(s);
}

const addSchema = z.object({ creatorIds: z.array(z.string()).min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!(await ownsShortlist(ctx.orgId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Skip duplicates (unique constraint shortlistId+creatorId).
  await prisma.shortlistItem.createMany({
    data: parsed.data.creatorIds.map((creatorId) => ({ shortlistId: id, creatorId })),
    skipDuplicates: true,
  });
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  creatorId: z.string(),
  tags: z.array(z.string()).optional(),
  note: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!(await ownsShortlist(ctx.orgId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.shortlistItem.update({
    where: { shortlistId_creatorId: { shortlistId: id, creatorId: parsed.data.creatorId } },
    data: { tags: parsed.data.tags, note: parsed.data.note ?? undefined },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!(await ownsShortlist(ctx.orgId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const creatorId = new URL(req.url).searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ error: "Missing creatorId" }, { status: 400 });
  await prisma.shortlistItem.delete({ where: { shortlistId_creatorId: { shortlistId: id, creatorId } } });
  return NextResponse.json({ ok: true });
}
