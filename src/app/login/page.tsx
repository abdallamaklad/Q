import "../marketing.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/rbac";
import { MarketingWordmark } from "@/components/marketing/wordmark";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Already signed in → go to the app.
  if (await getSessionContext()) redirect("/dashboard");

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <div className="mkt noise">
      <div className="auth-wrap">
        {/* ─── BRAND SIDE ─── */}
        <div className="auth-brand">
          <div className="orb orb-violet" style={{ width: 520, height: 520, top: -140, left: -120 }} />
          <div className="orb orb-heat" style={{ width: 380, height: 380, bottom: -120, right: -80 }} />
          <div className="grid-bg" style={{ height: "100%" }} />

          <Link href="/" className="rel" style={{ zIndex: 3 }} aria-label="Qulture home">
            <MarketingWordmark size="sm" />
          </Link>

          <div className="rel" style={{ zIndex: 3 }}>
            <h1 className="display" style={{ fontSize: "clamp(36px,4.5vw,56px)" }}>
              Discover<br />what <em>moves.</em>
            </h1>
            <p className="lead" style={{ marginTop: 20, maxWidth: 380 }}>
              Creator intelligence, engineered. Sign in to discover, vet, and track the voices shaping culture.
            </p>
            <div className="flex gap-s wrap" style={{ marginTop: 32 }}>
              <span className="tag">90M+ creators</span>
              <span className="tag">8 platforms</span>
              <span className="tag">AI ranked</span>
            </div>
          </div>

          <div className="rel mono" style={{ zIndex: 3, fontSize: 12, color: "var(--muted-2)", letterSpacing: "0.08em" }}>
            A QUANTARA PRODUCT · WEAREQUANTARA.COM
          </div>
        </div>

        {/* ─── FORM SIDE ─── */}
        <div className="auth-form-side">
          <div className="auth-card">
            <Link href="/" className="auth-mobile-logo" aria-label="Qulture home">
              <MarketingWordmark size="sm" />
            </Link>

            <h2 className="display" style={{ fontSize: 32 }}>Welcome back</h2>
            <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 15 }}>Sign in to your Qulture workspace.</p>

            <LoginForm />

            {demoMode && (
              <p className="auth-hint">
                Demo account: <b>demo@qulture.dev</b> / <b>demo1234</b>
              </p>
            )}

            <p className="auth-meta">
              No account? <Link href="/register">Create one</Link>
            </p>
            <p className="auth-foot">A QUANTARA PRODUCT</p>
          </div>
        </div>
      </div>
    </div>
  );
}
