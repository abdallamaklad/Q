import { prisma } from "@/lib/db";
import { cpm as computeCpm, roas as computeRoas } from "@/lib/scoring";

export interface CampaignRoi {
  campaignId: string;
  name: string;
  budget: number;
  spend: number;
  revenue: number;
  reach: number;
  impressions: number;
  engagements: number;
  conversions: number;
  cpm: number;
  roas: number;
  creatorCount: number;
}

/** Aggregate ROI metrics for a single campaign from posts, conversions, payments. */
export async function campaignRoi(campaignId: string): Promise<CampaignRoi | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      creators: {
        include: { posts: true, payments: true },
      },
      conversionEvents: true,
    },
  });
  if (!campaign) return null;

  let spend = 0;
  let reach = 0;
  let impressions = 0;
  let engagements = 0;
  for (const cc of campaign.creators) {
    spend += cc.payments.filter((p) => p.status === "paid" || p.status === "approved").reduce((s, p) => s + p.amount, 0);
    for (const post of cc.posts) {
      reach += post.reach;
      impressions += post.impressions;
      engagements += post.likes + post.comments + post.shares;
    }
  }
  const revenue = campaign.conversionEvents.reduce((s, e) => s + e.value, 0);
  const conversions = campaign.conversionEvents.length;

  return {
    campaignId: campaign.id,
    name: campaign.name,
    budget: campaign.budget,
    spend,
    revenue,
    reach,
    impressions,
    engagements,
    conversions,
    cpm: computeCpm(spend, impressions),
    roas: computeRoas(revenue, spend),
    creatorCount: campaign.creators.length,
  };
}

/** Workspace-wide rollup across all campaigns. */
export async function orgRoiSummary(orgId: string) {
  const campaigns = await prisma.campaign.findMany({ where: { orgId }, select: { id: true } });
  const rois = (await Promise.all(campaigns.map((c) => campaignRoi(c.id)))).filter(Boolean) as CampaignRoi[];
  const totals = rois.reduce(
    (acc, r) => ({
      spend: acc.spend + r.spend,
      revenue: acc.revenue + r.revenue,
      reach: acc.reach + r.reach,
      impressions: acc.impressions + r.impressions,
      engagements: acc.engagements + r.engagements,
      conversions: acc.conversions + r.conversions,
    }),
    { spend: 0, revenue: 0, reach: 0, impressions: 0, engagements: 0, conversions: 0 }
  );
  return {
    ...totals,
    cpm: computeCpm(totals.spend, totals.impressions),
    roas: computeRoas(totals.revenue, totals.spend),
    campaigns: rois,
  };
}
