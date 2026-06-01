import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";

const schema = z.object({
  claimantEmail: z.string().email(),
  submittedStats: z.record(z.string(), z.unknown()).optional(),
});

/**
 * First-party creator-claim flow (roadmap). A creator submits a claim to verify
 * a profile and attach self-reported analytics. Here we create a pending claim
 * with a verification code. TODO: send the code via email + verify ownership
 * (e.g. by posting the code in their bio), then flip status to "verified".
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const creator = await prisma.creator.findUnique({ where: { id }, select: { id: true } });
  if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const claim = await prisma.creatorClaim.create({
    data: {
      creatorId: id,
      claimantEmail: parsed.data.claimantEmail,
      verificationCode: nanoid(8).toUpperCase(),
      submittedStats: (parsed.data.submittedStats ?? {}) as object,
    },
  });
  // Do not leak the code in the response in production; returned here for the demo.
  return NextResponse.json({ ok: true, claimId: claim.id, verificationCode: claim.verificationCode });
}
