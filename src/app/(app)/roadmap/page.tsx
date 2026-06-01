import { Sparkles, BadgeCheck, ScanFace, LineChart } from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const ITEMS = [
  {
    icon: LineChart,
    title: "Predictive performance",
    status: "Live (heuristic-v1)",
    variant: "success" as const,
    body:
      "Every creator profile shows expected reach, engagements, CPM, and a confidence score from a transparent heuristic model (src/lib/scoring.predictPerformance). Documented for upgrade to a learned model trained on logged PostPerformance + ConversionEvents; recompute runs as a BullMQ analytics job.",
  },
  {
    icon: ScanFace,
    title: "AI-generated / deepfake detection",
    status: "Hooks in place",
    variant: "warning" as const,
    body:
      "Creators carry an aiGeneratedScore and content items a deepfakeScore, surfaced on the profile and as a search filter (maxAiGeneratedScore). The scoring hooks are stubbed for a real detector (frame/audio forensics, provenance signals) to populate these fields during ingestion.",
  },
  {
    icon: BadgeCheck,
    title: "First-party creator-claim flow",
    status: "MVP",
    variant: "secondary" as const,
    body:
      "Creators can claim a profile (POST /api/creators/:id/claim) to verify ownership and submit their own analytics. A verification code is issued; ownership verification + self-reported metric merging are the next steps.",
  },
];

export default async function RoadmapPage() {
  await requireSession();
  const claims = await prisma.creatorClaim.findMany({
    include: { creator: { select: { name: true, handle: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Sparkles className="h-5 w-5" /> Differentiators & roadmap</h1>
        <p className="text-sm text-muted-foreground">Scaffolded capabilities with clear upgrade paths.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ITEMS.map((it) => (
          <Card key={it.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><it.icon className="h-4 w-4" /> {it.title}</CardTitle>
              <Badge variant={it.variant} className="w-fit">{it.status}</Badge>
            </CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{it.body}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent creator claims</CardTitle></CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No claims submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {claims.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>{c.creator.name} <span className="text-muted-foreground">@{c.creator.handle}</span> · {c.claimantEmail}</span>
                  <Badge variant={c.status === "verified" ? "success" : c.status === "rejected" ? "destructive" : "secondary"} className="capitalize">{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
