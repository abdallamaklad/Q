"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QWordmark } from "@/components/brand/logo";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", orgName: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/");
    router.refresh();
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(155,92,255,0.30),transparent_70%)] blur-3xl" />
      <div className="relative w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <QWordmark className="justify-center text-3xl" />
          <p className="font-display text-base font-semibold">Create your workspace</p>
          <p className="text-sm text-muted-foreground">Start discovering creators in minutes</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={form.name} onChange={set("name")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgName">Workspace name</Label>
                <Input id="orgName" value={form.orgName} onChange={set("orgName")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={set("email")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (min 8 chars)</Label>
                <Input id="password" type="password" value={form.password} onChange={set("password")} required minLength={8} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating…" : "Create workspace"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Already have an account? <Link href="/login" className="underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
