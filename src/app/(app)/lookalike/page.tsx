"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Loader2, Building2 } from "lucide-react";
import type { CreatorSummary } from "@/lib/providers/types";
import { CreatorCard } from "@/components/creator-card";
import { EmptyState } from "@/components/empty-state";
import { AddToShortlistDialog } from "@/components/add-to-shortlist-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Brand { id: string; name: string; categoryTags: string[] }

function LookalikeInner() {
  const params = useSearchParams();
  const seedCreators = (params.get("creators") ?? "").split(",").filter(Boolean).slice(0, 10);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [seedBrands, setSeedBrands] = useState<string[]>((params.get("brands") ?? "").split(",").filter(Boolean).slice(0, 3));
  const [results, setResults] = useState<CreatorSummary[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brands").then((r) => r.json()).then((d) => setBrands(d.brands ?? []));
  }, []);

  async function run(payload: { creatorIds?: string[]; brandIds?: string[] }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lookalike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, limit: 24 }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setResults((await res.json()).creators);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  // Auto-run when seeded from query params.
  useEffect(() => {
    if (seedBrands.length) run({ brandIds: seedBrands });
    else if (seedCreators.length) run({ creatorIds: seedCreators });
  }, []); // run once on mount with the query-param seeds

  const toggleBrand = (id: string) =>
    setSeedBrands((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 3 ? [...s, id] : s));
  const toggleSel = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lookalike builder</h1>
        <p className="text-sm text-muted-foreground">Find similar creators from up to 10 seed creators or 3 brands (vector similarity).</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Seed by brand</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <button key={b.id} onClick={() => toggleBrand(b.id)}>
                <Badge variant={seedBrands.includes(b.id) ? "default" : "outline"} className="cursor-pointer">{b.name}</Badge>
              </button>
            ))}
          </div>
          <Button size="sm" disabled={!seedBrands.length} onClick={() => run({ brandIds: seedBrands })}>
            <Copy className="h-4 w-4" /> Find lookalikes ({seedBrands.length}/3 brands)
          </Button>
          {seedCreators.length > 0 && (
            <p className="text-xs text-muted-foreground">Seeded from {seedCreators.length} creator(s) you selected.</p>
          )}
        </CardContent>
      </Card>

      {selected.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-accent/40 p-3 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <AddToShortlistDialog creatorIds={selected} trigger={<Button variant="outline" size="sm">Add to shortlist</Button>} />
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      {error && <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card>}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}</div>
      ) : results.length === 0 ? (
        <EmptyState title="No lookalikes yet" description="Pick brands above, or select creators on the Discover page and click Lookalikes." icon={Copy} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((c) => <CreatorCard key={c.id} creator={c} selectable selected={selected.includes(c.id)} onToggle={toggleSel} />)}
        </div>
      )}
    </div>
  );
}

export default function LookalikePage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}>
      <LookalikeInner />
    </Suspense>
  );
}
