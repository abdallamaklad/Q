"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GitCompare, Loader2, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCompact } from "@/lib/utils";

interface OverlapCreator { id: string; name: string; handle: string; avatarUrl: string | null; followers: number }
interface Pair { a: string; b: string; overlapPct: number; sharedReach: number; uniqueReach: number; combinedReach: number }
interface OverlapResp { creators: OverlapCreator[]; pairs: Pair[]; combined: { combinedReach: number; avgOverlapPct: number } }

function OverlapInner() {
  const params = useSearchParams();
  const [ids, setIds] = useState<string[]>((params.get("creators") ?? "").split(",").filter(Boolean).slice(0, 5));
  const [data, setData] = useState<OverlapResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length < 2) { setData(null); return; }
    setLoading(true);
    setError(null);
    fetch("/api/overlap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creatorIds: ids }) })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? "Failed"); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ids]);

  const name = (id: string) => data?.creators.find((c) => c.id === id)?.name ?? id.slice(0, 6);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audience overlap</h1>
        <p className="text-sm text-muted-foreground">Compare 2–5 creators to see shared audience and combined unique reach.</p>
      </div>

      {data && (
        <div className="flex flex-wrap gap-2">
          {data.creators.map((c) => (
            <Badge key={c.id} variant="secondary" className="gap-1">
              {c.name}
              <button onClick={() => setIds((s) => s.filter((x) => x !== c.id))} aria-label="Remove"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          <Button asChild variant="outline" size="sm"><Link href="/search">+ Add creators</Link></Button>
        </div>
      )}

      {ids.length < 2 ? (
        <EmptyState title="Select at least 2 creators" description="Go to Discover, select 2–5 creators, and click Compare overlap." icon={GitCompare}
          action={<Button asChild><Link href="/search">Go to Discover</Link></Button>} />
      ) : loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Computing overlap…</div>
      ) : error ? (
        <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Combined unique reach" value={formatCompact(data.combined.combinedReach)} hint="de-duplicated across creators" />
            <StatCard label="Avg pairwise overlap" value={`${data.combined.avgOverlapPct}%`} />
            <StatCard label="Creators compared" value={data.creators.length} />
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Pairwise overlap</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator A</TableHead>
                    <TableHead>Creator B</TableHead>
                    <TableHead>Overlap</TableHead>
                    <TableHead>Shared reach</TableHead>
                    <TableHead>Combined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pairs.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{name(p.a)}</TableCell>
                      <TableCell>{name(p.b)}</TableCell>
                      <TableCell><Badge variant={p.overlapPct > 50 ? "warning" : "secondary"}>{p.overlapPct}%</Badge></TableCell>
                      <TableCell>{formatCompact(p.sharedReach)}</TableCell>
                      <TableCell>{formatCompact(p.combinedReach)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.creators.map((c) => (
              <Link key={c.id} href={`/creators/${c.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
                <Avatar><AvatarImage src={c.avatarUrl ?? undefined} /><AvatarFallback>{c.name.slice(0, 2)}</AvatarFallback></Avatar>
                <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{formatCompact(c.followers)} followers</p></div>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function OverlapPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}>
      <OverlapInner />
    </Suspense>
  );
}
