import { notFound } from "next/navigation";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { campaignRoi } from "@/lib/analytics";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignBoard, type BoardCreator } from "@/components/campaign-board";
import { formatCompact, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireSession();
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      brand: true,
      creators: {
        include: {
          creator: true,
          outreachThreads: { include: { messages: { orderBy: { sequenceStep: "asc" } } }, orderBy: { createdAt: "desc" } },
          posts: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!campaign) notFound();

  const roi = await campaignRoi(id);
  const boardCreators: BoardCreator[] = campaign.creators.map((cc) => ({
    ccId: cc.id,
    stage: cc.stage,
    rate: cc.rate,
    deliverables: cc.deliverables,
    notes: cc.notes,
    postCount: cc.posts.length,
    creator: {
      id: cc.creator.id,
      name: cc.creator.name,
      handle: cc.creator.handle,
      avatarUrl: cc.creator.avatarUrl,
      followerTotal: cc.creator.followerTotal,
    },
    threads: cc.outreachThreads.map((t) => ({
      id: t.id,
      messages: t.messages.map((m) => ({ id: m.id, body: m.body, status: m.status, sequenceStep: m.sequenceStep })),
    })),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">
            {campaign.brand ? `${campaign.brand.name} · ` : ""}{campaign.goal ?? "No goal set"}
          </p>
        </div>
        <Badge variant="success" className="capitalize">{campaign.status}</Badge>
      </div>

      {campaign.brief && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Brief</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{campaign.brief}</p></CardContent>
        </Card>
      )}

      {roi && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Budget" value={formatCurrency(roi.budget)} />
          <StatCard label="Spend" value={formatCurrency(roi.spend)} />
          <StatCard label="Revenue" value={formatCurrency(roi.revenue)} hint={`${roi.roas}x ROAS`} />
          <StatCard label="Reach" value={formatCompact(roi.reach)} hint={`CPM ${formatCurrency(roi.cpm)}`} />
          <StatCard label="Conversions" value={roi.conversions} />
        </div>
      )}

      <CampaignBoard campaignId={campaign.id} initial={boardCreators} />
    </div>
  );
}
