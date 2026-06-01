import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Liveness/readiness probe. Returns 200 when the DB is reachable, 503 otherwise.
// Used by the web container healthcheck and any external uptime monitor.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
