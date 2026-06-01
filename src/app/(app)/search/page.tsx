"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, SlidersHorizontal, Search as SearchIcon, Copy, GitCompare, ListPlus, Loader2 } from "lucide-react";
import { EMPTY_FILTERS, SORT_FIELDS, type CreatorFilters } from "@/lib/search/filters";
import type { SearchResult } from "@/lib/providers/types";
import { FiltersPanel } from "@/components/filters-panel";
import { CreatorCard } from "@/components/creator-card";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { AddToShortlistDialog } from "@/components/add-to-shortlist-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet } from "@/components/sheet";

export default function SearchPage() {
  const [filters, setFilters] = useState<CreatorFilters>({ ...EMPTY_FILTERS });
  const [prompt, setPrompt] = useState("");
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const runSearch = useCallback(async (f: CreatorFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Search failed");
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + whenever filters change.
  useEffect(() => {
    runSearch(filters);
  }, [filters, runSearch]);

  async function onParse() {
    if (!prompt.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/search/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not parse prompt");
      const data = await res.json();
      setInterpretation(data.interpretation);
      setFilters({ ...EMPTY_FILTERS, ...data.filters, page: 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const update = (patch: Partial<CreatorFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Discover creators</h1>
        <p className="text-sm text-muted-foreground">Describe who you want in plain English, or use advanced filters.</p>
      </div>

      {/* AI prompt search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onParse()}
                placeholder='e.g. "vegan fitness creators in Germany, 10k–50k followers, >5% engagement, female audience 25–34"'
                className="pl-9"
              />
            </div>
            <Button onClick={onParse} disabled={parsing}>
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
              Parse & search
            </Button>
          </div>
          {interpretation && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Interpreted as:</span> {interpretation}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-6">
        {/* Desktop filters */}
        <div className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border p-4">
            <FiltersPanel value={filters} onChange={(f) => update(f)} onReset={() => setFilters({ ...EMPTY_FILTERS })} />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort</span>
              <Select value={filters.sortBy} onValueChange={(v) => update({ sortBy: v as CreatorFilters["sortBy"] })}>
                <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_FIELDS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {result && (
              <Badge variant="secondary" className="ml-auto">
                {result.meta.usedVectorSearch ? "semantic" : result.meta.usedFullText ? "full-text" : "filtered"} · {result.total.toLocaleString()} results
              </Badge>
            )}
          </div>

          {/* Selection action bar */}
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 p-3 text-sm">
              <span className="font-medium">{selected.length} selected</span>
              <Button asChild variant="outline" size="sm" disabled={selected.length > 10}>
                <Link href={`/lookalike?creators=${selected.slice(0, 10).join(",")}`}><Copy className="h-4 w-4" /> Lookalikes</Link>
              </Button>
              <Button asChild variant="outline" size="sm" disabled={selected.length < 2 || selected.length > 5}>
                <Link href={`/overlap?creators=${selected.slice(0, 5).join(",")}`}><GitCompare className="h-4 w-4" /> Compare overlap</Link>
              </Button>
              <AddToShortlistDialog creatorIds={selected} trigger={<Button variant="outline" size="sm"><ListPlus className="h-4 w-4" /> Add to shortlist</Button>} />
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button>
            </div>
          )}

          {/* Results */}
          {error && <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card>}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
            </div>
          ) : result && result.creators.length === 0 ? (
            <EmptyState title="No creators match" description="Try widening your filters or rephrasing your prompt." icon={SearchIcon} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result?.creators.map((c) => (
                <CreatorCard key={c.id} creator={c} selectable selected={selected.includes(c.id)} onToggle={toggle} />
              ))}
            </div>
          )}

          {result && result.total > 0 && (
            <Pagination page={filters.page} pageSize={filters.pageSize} total={result.total} onPage={(p) => update({ page: p })} />
          )}
        </div>
      </div>

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <FiltersPanel value={filters} onChange={(f) => update(f)} onReset={() => setFilters({ ...EMPTY_FILTERS })} />
      </Sheet>
    </div>
  );
}
