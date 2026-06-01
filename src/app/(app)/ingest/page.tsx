import Link from "next/link";
import { DownloadCloud, ShieldX } from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { IngestForm } from "@/components/ingest-form";
import { PlatformBadge } from "@/components/platform-badge";
import { formatCompact, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IngestPage() {
  const ctx = await requireSession();

  if (ctx.role !== "admin") {
    return (
      <EmptyState
        title="Admin only"
        description="Data ingestion is restricted to workspace admins."
        icon={ShieldX}
      />
    );
  }

  // Recently ingested (real, non-mock) creators.
  const recent = await prisma.creator.findMany({
    where: { source: { not: null, notIn: ["mock"] } },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { accounts: { select: { platform: true }, take: 3 } },
  });
  const ingestedCount = await prisma.creator.count({ where: { source: { not: null, notIn: ["mock"] } } });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <DownloadCloud className="h-5 w-5" /> Ingest real creators
        </h1>
        <p className="text-sm text-muted-foreground">
          Pull live creators from YouTube into your workspace. They appear in Discover alongside everything else, with real metrics and fraud scores.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <IngestForm />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              Recently ingested
              <Badge variant="secondary">{formatCompact(ingestedCount)} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing ingested yet — run a keyword search or add handles.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((c) => (
                  <Link key={c.id} href={`/creators/${c.id}`} className="flex items-center gap-3 rounded-md border p-2 hover:bg-accent">
                    <Avatar className="h-8 w-8"><AvatarImage src={c.avatarUrl ?? undefined} /><AvatarFallback>{c.name.slice(0, 2)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCompact(c.followerTotal)} · {formatPercent(c.engagementRate)} eng</p>
                    </div>
                    {c.accounts.map((a) => <PlatformBadge key={a.platform} platform={a.platform} />)}
                    <Badge variant="outline" className="text-[10px] capitalize">{c.source}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
