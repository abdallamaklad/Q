import Link from "next/link";
import type { Metadata } from "next";
import { MarketingWordmark } from "@/components/marketing/wordmark";
import { CategoryFilter } from "@/components/marketing/category-filter";
import { NewsletterForm } from "@/components/marketing/newsletter-form";

export const metadata: Metadata = {
  title: "Insights — Qulture",
  description:
    "Intelligence on influencer marketing, platform shifts, and the technology reshaping how brands discover, vet, and measure creators.",
};

export default function InsightsPage() {
  return (
    <>
      {/* ═══ HEADER ═══ */}
      <header className="section" style={{ paddingTop: 170, paddingBottom: 60, overflow: "hidden" }}>
        <div className="orb orb-violet" style={{ width: 560, height: 560, top: -180, right: -120 }} />
        <div className="grid-bg" style={{ height: "120%" }} />
        <div className="container rel">
          <span className="eyebrow reveal">Insights</span>
          <h1 className="display reveal d1" style={{ marginTop: 24, maxWidth: 780 }}>
            The creator economy, <em>decoded.</em>
          </h1>
          <p className="lead reveal d2" style={{ marginTop: 22, maxWidth: 560 }}>
            Intelligence on influencer marketing, platform shifts, and the technology reshaping how brands discover, vet, and
            measure creators.
          </p>
        </div>
      </header>

      {/* ═══ FEATURED ═══ */}
      <section style={{ paddingBottom: 40 }}>
        <div className="container">
          <article
            className="card reveal"
            style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 0, padding: 0, overflow: "hidden", alignItems: "stretch" }}
          >
            <div style={{ padding: 48, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <span className="tag" style={{ alignSelf: "flex-start" }}>Featured · AI &amp; Discovery</span>
              <h2 className="display" style={{ fontSize: "clamp(26px,3vw,38px)", marginTop: 24, lineHeight: 1.1 }}>
                How AI is rewriting influencer discovery in 2026
              </h2>
              <p style={{ color: "var(--muted)", marginTop: 18, fontSize: 16, lineHeight: 1.7 }}>
                Natural-language search, predictive performance, and synthetic-creator detection are collapsing a multi-week
                workflow into minutes. Here&apos;s what&apos;s actually changing — and what&apos;s hype.
              </p>
              <Link href="/login" className="btn btn-ghost" style={{ alignSelf: "flex-start", marginTop: 28 }}>
                Read article
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
            <div
              style={{
                background: "linear-gradient(135deg, rgba(155,92,255,0.22), rgba(255,70,204,0.12))",
                position: "relative",
                minHeight: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div className="orb orb-data" style={{ width: 260, height: 260, top: "30%", left: "30%" }} />
              <MarketingWordmark size="md" style={{ color: "#fff", opacity: 0.92, position: "relative" }} />
            </div>
          </article>
        </div>
      </section>

      {/* ═══ FILTER + GRID + NEWSLETTER ═══ */}
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <CategoryFilter />

          <div
            className="card reveal"
            style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 40, alignItems: "center", background: "var(--bg3)" }}
          >
            <div>
              <h3 className="display" style={{ fontSize: 26 }}>Weekly intelligence, no noise.</h3>
              <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 15 }}>
                The signals shaping the creator economy — delivered every week. Built for brands that move at the speed of
                culture.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
