"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function IngestForm() {
  const router = useRouter();
  const [platform, setPlatform] = useState("youtube");
  const [query, setQuery] = useState("");
  const [handles, setHandles] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setLoading(true);
    setMsg(null);
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
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok" disabled>TikTok (coming soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Keyword search</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='e.g. "vegan fitness" — discovers channels' />
        </div>
        <div className="space-y-1">
          <Label>{platform === "instagram" ? "Instagram handles (one per line / comma-separated)" : "Channel handles or IDs (one per line / comma-separated)"}</Label>
          <Textarea
            value={handles}
            onChange={(e) => setHandles(e.target.value)}
            placeholder={platform === "instagram" ? "@natgeo\n@nike\n@hudabeauty" : "@mkbhd\n@mrbeast\nUCX6OQ3DkcsbYNE6H8uQQuVA"}
            className="min-h-[90px] font-mono text-xs"
          />
        </div>
        <Button onClick={submit} disabled={loading || (!query && !handles.trim())} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Ingest from {platform === "instagram" ? "Instagram" : "YouTube"}
        </Button>
        {msg && <p className={msg.ok ? "text-sm text-emerald-500" : "text-sm text-destructive"}>{msg.text}</p>}
        <p className="text-xs text-muted-foreground">
          Ingestion runs in the background worker. Keyword search uses more API quota than handle lookups.
        </p>
      </CardContent>
    </Card>
  );
}
