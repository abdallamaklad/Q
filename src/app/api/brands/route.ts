import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;
  const brands = await prisma.brand.findMany({
    where: { orgId: ctx.orgId },
    select: { id: true, name: true, categoryTags: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ brands });
}
