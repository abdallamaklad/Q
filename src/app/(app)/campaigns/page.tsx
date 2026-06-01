import Link from "next/link";
import { Megaphone } from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { NewCampaignButton } from "@/components/new-campaign-button";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "secondary" | "success" | "warning"> = {
  draft: "secondary", active: "success", paused: "warning", completed: "secondary", archived: "secondary",
};

export default async function CampaignsPage() {
  const ctx = await requireSession();
  const campaigns = await prisma.campaign.findMany({
    where: { orgId: ctx.orgId },
    include: { brand: true, _count: { select: { creators: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Track creators from outreach to completion.</p>
        </div>
        <NewCampaignButton />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState title="No campaigns yet" description="Create your first campaign to start managing creators." icon={Megaphone} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{c.name}</p>
                    <Badge variant={STATUS_VARIANT[c.status]} className="capitalize">{c.status}</Badge>
                  </div>
                  {c.brand && <p className="text-xs text-muted-foreground">{c.brand.name}</p>}
                  {c.goal && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.goal}</p>}
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{c._count.creators} creators</span>
                    <span className="font-medium">{formatCurrency(c.budget)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
