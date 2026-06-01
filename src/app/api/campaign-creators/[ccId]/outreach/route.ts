import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getLLM } from "@/lib/llm";

const genSchema = z.object({ tone: z.enum(["friendly", "professional", "playful"]).optional(), followups: z.number().int().min(0).max(3).default(2) });

// Generate AI outreach DRAFTS (first message + follow-up sequence).
// IMPORTANT: everything is created as status="draft" and never sent.
export async function POST(req: Request, { params }: { params: Promise<{ ccId: string }> }) {
  const ctx = await requireApi("member");
  if (ctx instanceof NextResponse) return ctx;
  const { ccId } = await params;

  const cc = await prisma.campaignCreator.findFirst({
    where: { id: ccId, campaign: { orgId: ctx.orgId } },
    include: { creator: true, campaign: { include: { brand: true } } },
  });
  if (!cc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = genSchema.safeParse(await req.json().catch(() => ({})));
  const { tone, followups } = parsed.success ? parsed.data : { tone: undefined, followups: 2 };

  const llm = getLLM();
  const input = {
    creatorName: cc.creator.name,
    creatorCategories: cc.creator.categoryTags,
    brandName: cc.campaign.brand?.name ?? cc.campaign.name,
    campaignName: cc.campaign.name,
    campaignGoal: cc.campaign.goal,
    tone,
  };
  const [first, follow] = await Promise.all([llm.draftOutreach(input), llm.draftFollowups(input, followups)]);

  const thread = await prisma.outreachThread.create({
    data: {
      campaignCreatorId: ccId,
      subject: `Collab: ${cc.campaign.name}`,
      messages: {
        create: [
          { role: "outbound", status: "draft", sequenceStep: 0, body: first, generatedBy: llm.name },
          ...follow.map((body, i) => ({ role: "outbound" as const, status: "draft" as const, sequenceStep: i + 1, body, generatedBy: llm.name })),
        ],
      },
    },
    include: { messages: { orderBy: { sequenceStep: "asc" } } },
  });

  return NextResponse.json({ thread, llm: llm.name });
}
