"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Brand { id: string; name: string }

export function NewCampaignButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState({ name: "", goal: "", brief: "", budget: "", brandId: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) fetch("/api/brands").then((r) => r.json()).then((d) => setBrands(d.brands ?? []));
  }, [open]);

  async function create() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        goal: form.goal || undefined,
        brief: form.brief || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        brandId: form.brandId || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { campaign } = await res.json();
      setOpen(false);
      router.push(`/campaigns/${campaign.id}`);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New campaign</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create campaign</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={set("name")} /></div>
          <div className="space-y-1"><Label>Goal</Label><Input value={form.goal} onChange={set("goal")} placeholder="e.g. drive 5,000 signups" /></div>
          <div className="space-y-1"><Label>Brief</Label><Textarea value={form.brief} onChange={set("brief")} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Budget (USD)</Label><Input type="number" value={form.budget} onChange={set("budget")} /></div>
            <div className="space-y-1">
              <Label>Brand</Label>
              <Select value={form.brandId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, brandId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={create} disabled={saving} className="w-full">{saving ? "Creating…" : "Create campaign"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
