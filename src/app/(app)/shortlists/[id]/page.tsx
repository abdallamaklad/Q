import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ShortlistItems, type ShortlistItemData } from "@/components/shortlist-items";

export const dynamic = "force-dynamic";

export default async function ShortlistDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireSession();
  const { id } = await params;
  const shortlist = await prisma.shortlist.findFirst({
    where: { id, orgId: ctx.orgId },
    include: { items: { include: { creator: true }, orderBy: { addedAt: "asc" } } },
  });
  if (!shortlist) notFound();

  const initial: ShortlistItemData[] = shortlist.items.map((i) => ({
    creatorId: i.creatorId,
    name: i.creator.name,
    handle: i.creator.handle,
    avatarUrl: i.creator.avatarUrl,
    followers: i.creator.followerTotal,
    tags: i.tags,
    note: i.note,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{shortlist.name}</h1>
          {shortlist.notes && <p className="text-sm text-muted-foreground">{shortlist.notes}</p>}
        </div>
        <Button asChild variant="outline"><a href={`/api/shortlists/${shortlist.id}/export`}><Download className="h-4 w-4" /> Export CSV</a></Button>
      </div>
      <ShortlistItems shortlistId={shortlist.id} initial={initial} />
    </div>
  );
}
