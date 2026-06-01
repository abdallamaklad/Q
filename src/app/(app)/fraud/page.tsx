import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FraudBadge, QualityBadge } from "@/components/score-badge";
import { PlatformBadge } from "@/components/platform-badge";
import { formatCompact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FraudPage() {
  await requireSession();

  const [highFake, pods, anomalies, flagged] = await Promise.all([
    prisma.audienceReport.count({ where: { fakeFollowerScore: { gte: 40 } } }),
    prisma.audienceReport.count({ where: { suspectedPod: true } }),
    prisma.audienceReport.count({ where: { engagementAnomaly: true } }),
    prisma.audienceReport.findMany({
      where: { OR: [{ suspectedPod: true }, { engagementAnomaly: true }, { fakeFollowerScore: { gte: 45 } }] },
      include: { account: { include: { creator: true } } },
      orderBy: { fakeFollowerScore: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fraud signals</h1>
        <p className="text-sm text-muted-foreground">Fake followers, engagement anomalies, and suspected pods across indexed accounts.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="High fake-follower (≥40%)" value={formatCompact(highFake)} />
        <StatCard label="Suspected pods" value={formatCompact(pods)} />
        <StatCard label="Engagement anomalies" value={formatCompact(anomalies)} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> Top flagged accounts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Fake</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flagged.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Link href={`/creators/${r.account.creator.id}`} className="font-medium hover:underline">{r.account.creator.name}</Link></TableCell>
                  <TableCell><PlatformBadge platform={r.account.platform} /></TableCell>
                  <TableCell>{formatCompact(r.account.followers)}</TableCell>
                  <TableCell><FraudBadge score={Math.round(r.fakeFollowerScore)} /></TableCell>
                  <TableCell><QualityBadge score={Math.round(r.audienceQualityScore)} /></TableCell>
                  <TableCell className="space-x-1">
                    {r.engagementAnomaly && <Badge variant="destructive">anomaly</Badge>}
                    {r.suspectedPod && <Badge variant="destructive">pod</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
