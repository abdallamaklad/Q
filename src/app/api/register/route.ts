import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(1),
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "workspace";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password, orgName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  // Ensure a unique org slug.
  let slug = slugify(orgName);
  for (let i = 1; await prisma.org.findUnique({ where: { slug } }); i++) slug = `${slugify(orgName)}-${i}`;

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      memberships: { create: { org: { create: { name: orgName, slug } }, role: "admin" } },
    },
  });

  return NextResponse.json({ ok: true });
}
