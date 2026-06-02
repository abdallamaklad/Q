"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Discovered { handle: string; name?: string }

export function IngestForm() {
  const router = useRouter();
  const [platform, setPlatform] = useState("youtube");
  const [query, setQuery] = useState("");
  const [handles, setHandles] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [discovered, setDiscovered] = useState<Discovered[] | null>(null);

  const isIG = platform === "instagram";

  async function submit() {
    setLoading(true);
    setMsg(null);
    setDiscovered(null);

    if (isIG) {
      // Phase 1: AI-assisted discovery → candidate handles (enrichment via Graph API is next).
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "instagram", keyword: query, limit: 12 }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (res.ok) {
        setDiscovered(data.creators ?? []);
        setMsg({ ok: true, text: `AI suggested ${data.creators?.length ?? 0} candidate handle(s) via ${data.llm}. Real profiles arrive once the Instagram Graph API enrichment is wired (next phase).` });
      } else {
        setMsg({ ok: false, text: data.error ?? "Discovery failed" });
      }
      return;
    }

    const handleList = handles.split(/[\s,]+/).map((h) => h.trim()).filter(Boolean);
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, query: query || undefined, handles: handleList.length ? handleList : undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg({ ok: true, text: `Queued ${data.queued} job(s). ${data.note ?? ""}` });
      setQuery("");
      setHandles("");
      setTimeout(() => router.refresh(), 4000);
    } else {
      setMsg({ ok: false, text: data.error ?? "Failed" });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <Label>Platform</Label>
          <Select value={platform} onValueChange={(v) => { setPlatform(v); setDiscovered(null); setMsg(null); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="instagram">Instagram (AI discovery)</SelectItem>
              <SelectItem value="tiktok" disabled>TikTok (coming soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{isIG ? "Niche / keyword" : "Keyword search"}</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='e.g. "vegan fitness"' />
        </div>

        {!isIG && (
          <div className="space-y-1">
            <Label>Channel handles or IDs (one per line / comma-separated)</Label>
            <Textarea value={handles} onChange={(e) => setHandles(e.target.value)} placeholder={"@mkbhd\n@mrbeast\nUCX6OQ3DkcsbYNE6H8uQQuVA"} className="min-h-[90px] font-mono text-xs" />
          </div>
        )}

        <Button onClick={submit} disabled={loading || (isIG ? !query.trim() : !query && !handles.trim())} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isIG ? <Sparkles className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {isIG ? "AI Discover handles" : "Ingest from YouTube"}
        </Button>

        {msg && <p className={msg.ok ? "text-sm text-emerald-500" : "text-sm text-destructive"}>{msg.text}</p>}

        {discovered && discovered.length > 0 && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Candidate handles</p>
            <div className="flex flex-wrap gap-1.5">
              {discovered.map((c) => (
                <a key={c.handle} href={`https://instagram.com/${c.handle}`} target="_blank" rel="noreferrer">
                  <Badge variant="secondary" title={c.name}>@{c.handle}</Badge>
                </a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Candidates from the AI layer — the Graph API enrichment (next) will validate these and pull real metrics.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {isIG
            ? "Instagram uses AI-assisted discovery (no scraping). Set ANTHROPIC_API_KEY for real suggestions; otherwise you'll see placeholders."
            : "Ingestion runs in the background worker. Keyword search uses more API quota than handle lookups."}
        </p>
      </CardContent>
    </Card>
  );
}
