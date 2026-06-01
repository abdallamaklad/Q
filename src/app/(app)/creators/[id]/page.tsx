import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Copy, Sparkles, ShieldAlert, AlertTriangle, ListPlus } from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { getDataProvider } from "@/lib/providers";
import { getLLM } from "@/lib/llm";
import { predictPerformance } from "@/lib/scoring";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/stat-card";
import { PlatformBadge } from "@/components/platform-badge";
import { QualityBadge, FraudBadge } from "@/components/score-badge";
import { AudienceCharts } from "@/components/audience-charts";
import { AddToShortlistDialog } from "@/components/add-to-shortlist-dialog";
import { formatCompact, formatPercent, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CreatorProfile({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const provider = getDataProvider();
  const creator = await provider.getCreator(id);
  if (!creator) notFound();

  const primary = creator.accounts.find((a) => a.followers > 0) ?? creator.accounts[0];
  const [report, content] = await Promise.all([
    primary ? provider.getAudienceReport(await accountIdFor(id, primary.platform)) : null,
    primary ? provider.getContent(await accountIdFor(id, primary.platform), 12) : Promise.resolve([]),
  ]);

  const summary = await getLLM().summarizeProfile({
    name: creator.name,
    categoryTags: creator.categoryTags,
    location: creator.location,
    followerTotal: creator.followerTotal,
    engagementRate: creator.engagementRate,
    growthRate: creator.growthRate,
    platforms: creator.accounts.map((a) => ({ platform: a.platform, followers: a.followers })),
    topInterests: report ? Object.keys(report.interestDistribution).slice(0, 3) : [],
    fakeFollowerScore: report?.fakeFollowerScore ?? 0,
    audienceQualityScore: report?.audienceQualityScore ?? 0,
  });

  const prediction = predictPerformance({
    followers: creator.followerTotal,
    engagementRate: creator.engagementRate,
    audienceQualityScore: report?.audienceQualityScore ?? 50,
  });

  const avgSentiment = content.length
    ? content.reduce((s, c) => s + c.sentiment, 0) / content.length
    : 0;
  const sentimentLabel = avgSentiment > 0.3 ? "Positive" : avgSentiment > 0 ? "Mostly positive" : "Mixed/negative";

  const initials = creator.name.split(" ").map((s) => s[0]).slice(0, 2).join("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={creator.avatarUrl ?? undefined} alt={creator.name} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{creator.name}</h1>
              {creator.verified && <BadgeCheck className="h-5 w-5 text-blue-600" />}
            </div>
            <p className="text-sm text-muted-foreground">@{creator.handle} · {creator.location ?? "—"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {creator.accounts.map((a) => <PlatformBadge key={a.platform} platform={a.platform} />)}
              {creator.categoryTags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
              {creator.languages.map((l) => <Badge key={l} variant="outline">{l}</Badge>)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <AddToShortlistDialog creatorIds={[creator.id]} trigger={<Button variant="outline"><ListPlus className="h-4 w-4" /> Shortlist</Button>} />
          <Button asChild><Link href={`/lookalike?creators=${creator.id}`}><Copy className="h-4 w-4" /> Lookalikes</Link></Button>
        </div>
      </div>

      {/* Cross-platform metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total followers" value={formatCompact(creator.followerTotal)} />
        <StatCard label="Engagement" value={formatPercent(creator.engagementRate)} />
        <StatCard label="Monthly growth" value={formatPercent(creator.growthRate)} />
        <StatCard label="Comment sentiment" value={sentimentLabel} hint={`avg ${avgSentiment.toFixed(2)}`} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="fraud">Fraud & quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> AI profile summary</CardTitle></CardHeader>
            <CardContent><p className="text-sm leading-relaxed">{summary}</p></CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Per-platform breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {creator.accounts.map((a) => (
                  <div key={a.platform} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span className="flex items-center gap-2"><PlatformBadge platform={a.platform} /> @{a.handle}</span>
                    <span className="text-muted-foreground">{formatCompact(a.followers)} · {formatPercent(a.engagementRate)} eng</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Predicted post performance <Badge variant="outline" className="ml-1">heuristic-v1</Badge></CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Expected reach</p><p className="text-lg font-semibold">{formatCompact(prediction.expectedReach)}</p></div>
                <div><p className="text-muted-foreground">Expected engagements</p><p className="text-lg font-semibold">{formatCompact(prediction.expectedEngagements)}</p></div>
                <div><p className="text-muted-foreground">Est. CPM</p><p className="text-lg font-semibold">{formatCurrency(prediction.expectedCpm)}</p></div>
                <div><p className="text-muted-foreground">Confidence</p><p className="text-lg font-semibold">{Math.round(prediction.confidence * 100)}%</p></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audience">
          {report ? (
            <AudienceCharts
              gender={report.genderDistribution}
              age={report.ageDistribution}
              geo={report.geoDistribution}
              interests={report.interestDistribution}
              history={primary?.history.map((h) => ({ date: h.date, followers: h.followers })) ?? []}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No audience report available.</p>
          )}
        </TabsContent>

        <TabsContent value="content">
          {content.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent content.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <PlatformBadge platform={c.platform} />
                      <Badge variant="outline" className="capitalize">{c.type}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm">{c.caption}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.hashtags.slice(0, 3).map((h) => <Badge key={h} variant="secondary" className="text-[10px]">#{h}</Badge>)}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>♥ {formatCompact(c.metrics.likes)} · 💬 {formatCompact(c.metrics.comments)}</span>
                      {c.deepfakeScore > 0.5 && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3 w-3" /> AI?</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fraud" className="space-y-4">
          {report ? (
            <>
              <div className="flex flex-wrap gap-2">
                <FraudBadge score={report.fakeFollowerScore} />
                <QualityBadge score={report.audienceQualityScore} />
                {report.engagementAnomaly && <Badge variant="destructive">Engagement anomaly</Badge>}
                {report.suspectedPod && <Badge variant="destructive">Suspected pod</Badge>}
                {creator.aiGeneratedScore > 0.5 && <Badge variant="warning">Possible AI-generated persona ({Math.round(creator.aiGeneratedScore * 100)}%)</Badge>}
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> What these signals mean</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">Fake-follower score</span> estimates the share of inauthentic followers from engagement plausibility and account patterns.</p>
                  <p><span className="font-medium text-foreground">Audience-quality score</span> blends real-follower ratio, engagement health, and interest concentration.</p>
                  <p><span className="font-medium text-foreground">Engagement anomaly / suspected pod</span> flag coordinated or purchased engagement.</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No fraud report available.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper: resolve the PlatformAccount id for a creator+platform (DTO doesn't carry it).
async function accountIdFor(creatorId: string, platform: string): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const acct = await prisma.platformAccount.findFirst({
    where: { creatorId, platform: platform as never },
    select: { id: true },
  });
  return acct?.id ?? "";
}
