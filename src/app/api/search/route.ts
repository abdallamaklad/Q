import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api";
import { getDataProvider } from "@/lib/providers";
import { filtersSchema } from "@/lib/search/filters";

// Execute a structured creator search against the active DataProvider.
export async function POST(req: Request) {
  const ctx = await requireApi();
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => ({}));
  const parsed = filtersSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filters", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await getDataProvider().searchCreators(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Search failed" }, { status: 500 });
  }
}
