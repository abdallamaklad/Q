import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./db";
import type { Role } from "@prisma/client";

export type SessionContext = {
  userId: string;
  email: string;
  name: string | null;
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: Role;
};

const ROLE_RANK: Record<Role, number> = { viewer: 1, member: 2, admin: 3 };

/** Returns true if `role` meets or exceeds `required`. */
export function roleAtLeast(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/**
 * Resolve the current user's primary workspace context. Returns null if not
 * authenticated or the user has no membership. Server-side only.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { org: true, user: true },
    orderBy: { org: { createdAt: "asc" } },
  });
  if (!membership) return null;

  return {
    userId,
    email: membership.user.email,
    name: membership.user.name,
    orgId: membership.orgId,
    orgName: membership.org.name,
    orgSlug: membership.org.slug,
    role: membership.role,
  };
}

/** Require a session; redirect to /login if missing. Use in server components. */
export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Require a minimum role; throws if the user lacks it (for API routes). */
export function assertRole(ctx: SessionContext, required: Role): void {
  if (!roleAtLeast(ctx.role, required)) {
    throw new Error(`Forbidden: requires ${required} role`);
  }
}
