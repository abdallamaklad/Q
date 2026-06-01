import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";

async function ownsMessage(orgId: string, id: string) {
  return prisma.outreachMessage.findFirst({
    where: { id, thread: { campaignCreator: { campaign: { orgId } } } },
    select: { id: true, status: true },
  });
}

const patchSchema = z.object({
  body: z.string().optional(),
  // Explicit user action to record a send. We NEVER auto-send; this only marks
  // a message as sent after the user confirms in the UI.
  markSent: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!(await ownsMessage(ctx.orgId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const msg = await prisma.outreachMessage.update({
    where: { id },
    data: {
      body: parsed.data.body,
      ...(parsed.data.markSent ? { status: "sent", sentAt: new Date() } : {}),
    },
  });
  return NextResponse.json({ message: msg });
}
