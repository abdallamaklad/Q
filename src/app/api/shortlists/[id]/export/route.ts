import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Export a shortlist as CSV.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const shortlist = await prisma.shortlist.findFirst({
    where: { id, orgId: ctx.orgId },
    include: { items: { include: { creator: true } } },
  });
  if (!shortlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const header = ["name", "handle", "country", "followers", "engagementRate", "growthRate", "categories", "tags", "note"];
  const rows = shortlist.items.map((i) =>
    [
      i.creator.name,
      i.creator.handle,
      i.creator.country ?? "",
      i.creator.followerTotal,
      i.creator.engagementRate,
      i.creator.growthRate,
      i.creator.categoryTags.join("|"),
      i.tags.join("|"),
      i.note ?? "",
    ].map(csvCell).join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${shortlist.name.replace(/[^a-z0-9]+/gi, "-")}.csv"`,
    },
  });
}
