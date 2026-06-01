import { NextResponse } from "next/server";
import { getSessionContext, roleAtLeast, type SessionContext } from "@/lib/rbac";
import type { Role } from "@prisma/client";

/**
 * Guard for API routes. Returns the session context or a 401/403 NextResponse.
 * Usage:
 *   const ctx = await requireApi(); if (ctx instanceof NextResponse) return ctx;
 */
export async function requireApi(minRole: Role = "viewer"): Promise<SessionContext | NextResponse> {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roleAtLeast(ctx.role, minRole)) {
    return NextResponse.json({ error: `Forbidden: requires ${minRole} role` }, { status: 403 });
  }
  return ctx;
}
