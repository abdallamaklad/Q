import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/rbac";
import { QWordmark } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Already signed in → go to the app.
  if (await getSessionContext()) redirect("/");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Brand ambient glow */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(155,92,255,0.30),transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(255,70,204,0.18),transparent_70%)] blur-3xl" />

      <div className="relative w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <QWordmark className="justify-center text-4xl" />
          <p className="font-display text-lg font-semibold text-foreground">Discover what moves.</p>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Creator intelligence, engineered</p>
        </div>
        <LoginForm />
        {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
          <p className="text-center text-xs text-muted-foreground">
            Demo account: <span className="font-medium text-foreground">demo@qulture.dev</span> / <span className="font-medium text-foreground">demo1234</span>
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          No account? <Link href="/register" className="text-primary underline">Create one</Link>
        </p>
        <p className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">A Quantara product</p>
      </div>
    </div>
  );
}
