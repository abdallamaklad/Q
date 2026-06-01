import Link from "next/link";
import { ListChecks, Download } from "lucide-react";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { NewShortlistButton } from "@/components/new-shortlist-button";

export const dynamic = "force-dynamic";

export default async function ShortlistsPage() {
  const ctx = await requireSession();
  const shortlists = await prisma.shortlist.findMany({
    where: { orgId: ctx.orgId },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shortlists</h1>
          <p className="text-sm text-muted-foreground">Save, tag, annotate, and export creators.</p>
        </div>
        <NewShortlistButton />
      </div>

      {shortlists.length === 0 ? (
        <EmptyState title="No shortlists yet" description="Create a shortlist or add creators from Discover." icon={ListChecks} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shortlists.map((s) => (
            <Card key={s.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <Link href={`/shortlists/${s.id}`} className="flex-1">
                    <p className="font-medium">{s.name}</p>
                    {s.notes && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.notes}</p>}
                  </Link>
                  <Badge variant="secondary">{s._count.items}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button asChild variant="outline" size="sm"><Link href={`/shortlists/${s.id}`}>Open</Link></Button>
                  <Button asChild variant="ghost" size="sm"><a href={`/api/shortlists/${s.id}/export`}><Download className="h-4 w-4" /> CSV</a></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
