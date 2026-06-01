"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, Send, Plus, Loader2, BarChart3, Search, History, Save } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCompact, formatCurrency } from "@/lib/utils";

const STAGES = ["contacted", "negotiating", "booked", "live", "completed"] as const;
type Stage = (typeof STAGES)[number];

export interface BoardCreator {
  ccId: string;
  stage: Stage;
  rate: number;
  deliverables: string | null;
  notes: string | null;
  postCount: number;
  creator: { id: string; name: string; handle: string; avatarUrl: string | null; followerTotal: number };
  threads: { id: string; messages: { id: string; body: string; status: string; sequenceStep: number }[] }[];
}

export function CampaignBoard({ campaignId, initial }: { campaignId: string; initial: BoardCreator[] }) {
  const router = useRouter();
  const [creators, setCreators] = useState(initial);
  const [outreachFor, setOutreachFor] = useState<BoardCreator | null>(null);

  async function move(cc: BoardCreator, dir: -1 | 1) {
    const idx = STAGES.indexOf(cc.stage);
    const next = STAGES[idx + dir];
    if (!next) return;
    setCreators((cs) => cs.map((c) => (c.ccId === cc.ccId ? { ...c, stage: next } : c)));
    await fetch(`/api/campaign-creators/${cc.ccId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Pipeline</h2>
        <div className="flex gap-2">
          <LogConversionDialog campaignId={campaignId} onDone={() => router.refresh()} />
          <AddCreatorsDialog campaignId={campaignId} onDone={() => router.refresh()} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const col = creators.filter((c) => c.stage === stage);
          return (
            <div key={stage} className="rounded-lg border bg-muted/30 p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-medium capitalize">{stage}</span>
                <Badge variant="secondary">{col.length}</Badge>
              </div>
              <div className="space-y-2">
                {col.map((cc) => (
                  <Card key={cc.ccId}>
                    <CardContent className="space-y-2 p-3">
                      <Link href={`/creators/${cc.creator.id}`} className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarImage src={cc.creator.avatarUrl ?? undefined} /><AvatarFallback>{cc.creator.name.slice(0, 2)}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{cc.creator.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCompact(cc.creator.followerTotal)}</p>
                        </div>
                      </Link>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(cc.rate)}</span>
                        {cc.postCount > 0 && <span>{cc.postCount} post(s)</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={STAGES.indexOf(cc.stage) === 0} onClick={() => move(cc, -1)}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={() => setOutreachFor(cc)}><Sparkles className="h-3 w-3" /> Outreach</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={STAGES.indexOf(cc.stage) === STAGES.length - 1} onClick={() => move(cc, 1)}><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                      {cc.stage === "negotiating" && <NegotiationEditor cc={cc} />}
                    </CardContent>
                  </Card>
                ))}
                {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={!!outreachFor} onClose={() => setOutreachFor(null)} title={outreachFor ? `Outreach · ${outreachFor.creator.name}` : ""}>
        {outreachFor && <OutreachPanel cc={outreachFor} onChanged={() => router.refresh()} />}
      </Sheet>
    </div>
  );
}

interface HistoryEntry { id: string; rate: number; deliverables: string | null; changedBy: string; createdAt: string }

function NegotiationEditor({ cc }: { cc: BoardCreator }) {
  const [rate, setRate] = useState(String(cc.rate ?? ""));
  const [deliverables, setDeliverables] = useState(cc.deliverables ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  async function loadHistory() {
    const res = await fetch(`/api/campaign-creators/${cc.ccId}/history`);
    if (res.ok) setHistory((await res.json()).history);
  }
  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/campaign-creators/${cc.ccId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rate: rate === "" ? 0 : Number(rate), deliverables }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      if (showHistory) loadHistory();
    }
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/40 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Negotiation</p>
      <div className="space-y-1">
        <Label className="text-[11px]">Rate (USD)</Label>
        <Input type="number" value={rate} onChange={(e) => { setRate(e.target.value); setSaved(false); }} className="h-7 text-xs" placeholder="0" />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Deliverables</Label>
        <Input value={deliverables} onChange={(e) => { setDeliverables(e.target.value); setSaved(false); }} className="h-7 text-xs" placeholder="e.g. 1 reel + 3 stories" />
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" className="h-7 flex-1 text-xs" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} {saved ? "Saved" : "Save terms"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { const next = !showHistory; setShowHistory(next); if (next && history === null) loadHistory(); }}>
          <History className="h-3 w-3" /> History
        </Button>
      </div>
      {showHistory && (
        <div className="space-y-1">
          {history === null ? (
            <p className="text-[11px] text-muted-foreground">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No changes recorded yet.</p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="rounded border bg-background p-1.5 text-[11px]">
                <div className="flex justify-between"><span className="font-medium">{formatCurrency(h.rate)}</span><span className="text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span></div>
                {h.deliverables && <p className="text-muted-foreground">{h.deliverables}</p>}
                <p className="text-muted-foreground">by {h.changedBy}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function OutreachPanel({ cc, onChanged }: { cc: BoardCreator; onChanged: () => void }) {
  const [thread, setThread] = useState(cc.threads[0] ?? null);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    const res = await fetch(`/api/campaign-creators/${cc.ccId}/outreach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followups: 2 }),
    });
    setGenerating(false);
    if (res.ok) {
      const { thread } = await res.json();
      setThread(thread);
      onChanged();
    }
  }

  return (
    <div className="space-y-3">
      <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        Drafts only — nothing is ever sent automatically. Use “Mark as sent” to record that you sent a message yourself.
      </p>
      {!thread ? (
        <Button onClick={generate} disabled={generating} className="w-full">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate AI drafts
        </Button>
      ) : (
        <div className="space-y-3">
          {thread.messages.map((m) => (
            <OutreachMessageEditor key={m.id} message={m} onChanged={onChanged} />
          ))}
          <Button variant="outline" onClick={generate} disabled={generating} className="w-full">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}

function OutreachMessageEditor({ message, onChanged }: { message: { id: string; body: string; status: string; sequenceStep: number }; onChanged: () => void }) {
  const [body, setBody] = useState(message.body);
  const [status, setStatus] = useState(message.status);
  const [busy, setBusy] = useState(false);

  async function update(markSent: boolean) {
    setBusy(true);
    const res = await fetch(`/api/outreach-messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, markSent }),
    });
    setBusy(false);
    if (res.ok) { if (markSent) setStatus("sent"); onChanged(); }
  }

  return (
    <div className="space-y-1 rounded-md border p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{message.sequenceStep === 0 ? "First message" : `Follow-up ${message.sequenceStep}`}</span>
        <Badge variant={status === "sent" ? "success" : "secondary"}>{status}</Badge>
      </div>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[120px] text-xs" />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => update(false)}>Save draft</Button>
        <Button size="sm" disabled={busy || status === "sent"} onClick={() => update(true)}><Send className="h-3 w-3" /> Mark as sent</Button>
      </div>
    </div>
  );
}

function AddCreatorsDialog({ campaignId, onDone }: { campaignId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; handle: string; followerTotal: number }[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, pageSize: 10 }),
    });
    const data = await res.json();
    setResults(data.creators ?? []);
    setLoading(false);
  }
  async function add(creatorId: string) {
    await fetch(`/api/campaigns/${campaignId}/creators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorIds: [creatorId] }),
    });
    setResults((r) => r.filter((c) => c.id !== creatorId));
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Add creators</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add creators to campaign</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search creators…" />
          <Button onClick={search} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {results.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span>{c.name} <span className="text-muted-foreground">@{c.handle} · {formatCompact(c.followerTotal)}</span></span>
              <Button size="sm" variant="outline" onClick={() => add(c.id)}><Plus className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogConversionDialog({ campaignId, onDone }: { campaignId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "purchase", value: "" });
  async function submit() {
    await fetch(`/api/campaigns/${campaignId}/conversions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: form.type, value: form.value ? Number(form.value) : 0, source: "manual" }),
    });
    setOpen(false);
    setForm({ type: "purchase", value: "" });
    onDone();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><BarChart3 className="h-4 w-4" /> Log conversion</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log conversion event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Type</Label><Input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} /></div>
          <div className="space-y-1"><Label>Revenue (USD)</Label><Input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} /></div>
          <Button onClick={submit} className="w-full">Record</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
