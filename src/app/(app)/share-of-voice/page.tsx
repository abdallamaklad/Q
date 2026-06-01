"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Radio, Loader2 } from "lucide-react";
import { CATEGORY_OPTIONS } from "@/lib/search/options";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { formatCompact } from "@/lib/utils";

const COLORS = ["#9B5CFF", "#22D4EE", "#FF46CC", "#FFBA45", "#4EE89E", "#7040CC", "#FF8AD8", "#5EE6F5", "#FFD27A", "#B98CFF"];

interface SoVBrand { brand: string; mentions: number; creators: number; engagement: number; sharePct: number; engagementSharePct: number }

const TIMEFRAMES = [
  { label: "All time", value: "all" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];

export default function ShareOfVoicePage() {
  const [category, setCategory] = useState("all");
  const [timeframe, setTimeframe] = useState("all");
  const [brands, setBrands] = useState<SoVBrand[]>([]);
  const [totalMentions, setTotalMentions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (timeframe !== "all") params.set("since", new Date(Date.now() - Number(timeframe) * 86400000).toISOString());
    fetch(`/api/share-of-voice?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { setBrands(d.brands ?? []); setTotalMentions(d.totalMentions ?? 0); })
      .finally(() => setLoading(false));
  }, [category, timeframe]);

  const leader = brands[0];
  const chartData = brands.map((b) => ({ name: b.brand, share: b.sharePct }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Radio className="h-5 w-5" /> Brand share of voice</h1>
          <p className="text-sm text-muted-foreground">Share of creator conversation by brand, measured from content mentions.</p>
        </div>
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Computing share of voice…</div>
      ) : brands.length === 0 ? (
        <EmptyState title="No brand mentions found" description="Try a different category or timeframe." icon={Radio} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Brands tracked" value={brands.length} />
            <StatCard label="Total mentions" value={formatCompact(totalMentions)} />
            <StatCard label="Share leader" value={leader ? leader.brand : "—"} hint={leader ? `${leader.sharePct}% of voice` : undefined} />
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Mention share (%)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} unit="%" />
                  <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="share" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Mentions</TableHead>
                    <TableHead>Creators</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Mention share</TableHead>
                    <TableHead>Engagement share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((b) => (
                    <TableRow key={b.brand}>
                      <TableCell className="font-medium capitalize">{b.brand}</TableCell>
                      <TableCell>{formatCompact(b.mentions)}</TableCell>
                      <TableCell>{formatCompact(b.creators)}</TableCell>
                      <TableCell>{formatCompact(b.engagement)}</TableCell>
                      <TableCell><Badge variant="secondary">{b.sharePct}%</Badge></TableCell>
                      <TableCell><Badge variant="outline">{b.engagementSharePct}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
