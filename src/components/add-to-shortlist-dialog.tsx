"use client";
import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Shortlist { id: string; name: string; _count?: { items: number } }

export function AddToShortlistDialog({ creatorIds, trigger }: { creatorIds: string[]; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/shortlists")
      .then((r) => r.json())
      .then((d) => setLists(d.shortlists ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  async function addTo(shortlistId: string) {
    setStatus(null);
    const res = await fetch(`/api/shortlists/${shortlistId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorIds }),
    });
    setStatus(res.ok ? `Added ${creatorIds.length} creator(s).` : "Failed to add.");
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    const res = await fetch("/api/shortlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, creatorIds }),
    });
    if (res.ok) {
      setNewName("");
      setStatus(`Created "${newName}" with ${creatorIds.length} creator(s).`);
      const d = await fetch("/api/shortlists").then((r) => r.json());
      setLists(d.shortlists ?? []);
    } else setStatus("Failed to create.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {creatorIds.length} creator(s) to a shortlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="max-h-52 space-y-1 overflow-y-auto">
              {lists.length === 0 && <p className="text-sm text-muted-foreground">No shortlists yet — create one below.</p>}
              {lists.map((l) => (
                <button key={l.id} onClick={() => addTo(l.id)} className="flex w-full items-center justify-between rounded-md border p-2 text-sm hover:bg-accent">
                  <span>{l.name}</span>
                  <Plus className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input placeholder="New shortlist name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Button onClick={createAndAdd}>Create</Button>
          </div>
          {status && <p className="text-sm text-emerald-600">{status}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
