"use client";
import { useState } from "react";
import Link from "next/link";
import { Trash2, Save } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/tag-input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatCompact } from "@/lib/utils";

export interface ShortlistItemData {
  creatorId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  followers: number;
  tags: string[];
  note: string | null;
}

export function ShortlistItems({ shortlistId, initial }: { shortlistId: string; initial: ShortlistItemData[] }) {
  const [items, setItems] = useState(initial);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function save(item: ShortlistItemData) {
    setSavingId(item.creatorId);
    await fetch(`/api/shortlists/${shortlistId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId: item.creatorId, tags: item.tags, note: item.note }),
    });
    setSavingId(null);
  }
  async function remove(creatorId: string) {
    await fetch(`/api/shortlists/${shortlistId}/items?creatorId=${creatorId}`, { method: "DELETE" });
    setItems((s) => s.filter((i) => i.creatorId !== creatorId));
  }
  const patch = (creatorId: string, p: Partial<ShortlistItemData>) =>
    setItems((s) => s.map((i) => (i.creatorId === creatorId ? { ...i, ...p } : i)));

  if (items.length === 0) return <EmptyState title="Empty shortlist" description="Add creators from Discover or a creator profile." />;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.creatorId}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Link href={`/creators/${item.creatorId}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar><AvatarImage src={item.avatarUrl ?? undefined} /><AvatarFallback>{item.name.slice(0, 2)}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">@{item.handle} · {formatCompact(item.followers)}</p>
              </div>
            </Link>
            <div className="flex-1 space-y-2">
              <TagInput value={item.tags} onChange={(tags) => patch(item.creatorId, { tags })} placeholder="add tag…" />
              <Input value={item.note ?? ""} onChange={(e) => patch(item.creatorId, { note: e.target.value })} placeholder="Note…" className="h-8" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={savingId === item.creatorId} onClick={() => save(item)}>
                <Save className="h-4 w-4" /> {savingId === item.creatorId ? "…" : "Save"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(item.creatorId)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
