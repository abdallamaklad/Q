import Link from "next/link";
import { Search, Megaphone, ListChecks, ShieldAlert, ArrowRight } from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { orgRoiSummary } from "@/lib/analytics";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCompact, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireSession();

  const [creatorCount, campaignCount, shortlistCount, flagged, roi] = await Promise.all([
    prisma.creator.count(),
    prisma.campaign.count({ where: { orgId: ctx.orgId } }),
    prisma.shortlist.count({ where: { orgId: ctx.orgId } }),
    prisma.audienceReport.count({ where: { OR: [{ suspectedPod: true }, { engagementAnomaly: true }] } }),
    orgRoiSummary(ctx.orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">{ctx.orgName} workspace overview</p>
        </div>
        <Button asChild>
          <Link href="/search"><Search className="h-4 w-4" /> Discover creators</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Creators indexed" value={formatCompact(creatorCount)} hint="across 8 platforms" />
        <StatCard label="Campaigns" value={campaignCount} hint={`${shortlistCount} shortlist(s)`} />
        <StatCard label="Tracked revenue" value={formatCurrency(roi.revenue)} hint={`ROAS ${roi.roas}x`} />
        <StatCard label="Fraud flags" value={formatCompact(flagged)} hint="accounts with anomalies" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {roi.campaigns.length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
            {roi.campaigns.map((c) => (
              <Link key={c.campaignId} href={`/campaigns/${c.campaignId}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.creatorCount} creators · reach {formatCompact(c.reach)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(c.revenue)}</p>
                  <Badge variant={c.roas >= 1 ? "success" : "secondary"}>{c.roas}x ROAS</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jump back in</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              { href: "/search", label: "AI prompt search", icon: Search },
              { href: "/campaigns", label: "Manage campaigns", icon: Megaphone },
              { href: "/shortlists", label: "Your shortlists", icon: ListChecks },
              { href: "/fraud", label: "Review fraud signals", icon: ShieldAlert },
            ].map((q) => (
              <Link key={q.href} href={q.href} className="flex items-center gap-3 rounded-md border p-3 text-sm font-medium hover:bg-accent">
                <q.icon className="h-4 w-4" />
                {q.label}
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
