import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApi } from "@/lib/api";
import { getDataProvider } from "@/lib/providers";

const schema = z.object({
  creatorIds: z.array(z.string()).max(10).optional(),
  brandIds: z.array(z.string()).max(3).optional(),
  limit: z.number().int().positive().max(50).default(24),
});

// Vector-similarity lookalikes from up to 10 creators or 3 brands.
export async function POST(req: Request) {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { creatorIds = [], brandIds = [], limit } = parsed.data;
  if (creatorIds.length === 0 && brandIds.length === 0) {
    return NextResponse.json({ error: "Provide creatorIds or brandIds" }, { status: 400 });
  }

  try {
    const provider = getDataProvider();
    const creators = brandIds.length
      ? await provider.lookalikeByBrands(brandIds, limit)
      : await provider.lookalikeByCreators(creatorIds, limit);
    return NextResponse.json({ creators });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lookalike failed" }, { status: 500 });
  }
}
