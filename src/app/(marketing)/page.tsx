import Link from "next/link";
import type { Metadata } from "next";
import { TallyCta } from "@/components/marketing/tally-cta";

export const metadata: Metadata = {
  title: "Qulture — Discover what moves.",
  description:
    "Creator intelligence, engineered. Discover, vet, and track influencers across every major platform — signal over noise. A Quantara product.",
};

const ArrowIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const capabilities = [
  {
    title: "AI Discovery",
    body:
      "Describe who you're looking for in plain language. Qulture searches 90M+ creators across platforms and ranks by fit — not popularity.",
    bg: "rgba(155,92,255,0.12)",
    border: "var(--border)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="10.5" cy="10.5" r="6.5" stroke="#9B5CFF" strokeWidth="1.8" />
        <path d="M16 16l4.5 4.5" stroke="#9B5CFF" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Vetting & Trust",
    body:
      "Fake-follower scoring, audience quality, sentiment analysis, and brand-safety flags — 20+ metrics per creator before you ever reach out.",
    bg: "rgba(255,70,204,0.12)",
    border: "rgba(255,70,204,0.25)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="#FF46CC" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 11.5l2 2 4-4" stroke="#FF46CC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Campaign Tracking",
    body:
      "Monitor posts, stories, and reels in real time. Track reach, engagement, and revenue per creator — closed-loop, not guesswork.",
    bg: "rgba(34,212,238,0.12)",
    border: "rgba(34,212,238,0.25)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 18l5-5 3 3 8-8" stroke="#22D4EE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 8h4v4" stroke="#22D4EE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Lookalike Builder",
    body:
      "Found a creator who converts? Generate a ranked list of lookalikes by audience overlap and content DNA — scale what works.",
    bg: "rgba(255,186,69,0.12)",
    border: "rgba(255,186,69,0.25)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="7" cy="8" r="3" stroke="#FFBA45" strokeWidth="1.6" />
        <circle cx="16" cy="14" r="3" stroke="#FFBA45" strokeWidth="1.6" />
        <path d="M9.5 9.5l4 3" stroke="#FFBA45" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

const stats = [
  { value: "90M+", label: "CREATOR PROFILES", color: "var(--brand)", style: {} },
  { value: "8", label: "PLATFORMS", color: "var(--white)", style: { borderInline: "1px solid var(--border-2)" } },
  { value: "50+", label: "DISCOVERY FILTERS", color: "var(--white)", style: { borderRight: "1px solid var(--border-2)" } },
  { value: "∞", label: "ENGINEERED TO COMPOUND", color: "var(--white)", style: {} },
];

const steps = [
  {
    step: "STEP 01",
    color: "var(--brand)",
    title: "Describe",
    body:
      '"Female fitness creators in the UAE, 10–100k followers, 25–34 audience." Qulture parses intent and searches instantly.',
  },
  {
    step: "STEP 02",
    color: "var(--heat)",
    title: "Vet",
    body:
      "Review audience quality, authenticity scores, and brand-safety flags. Shortlist only the creators worth your budget.",
  },
  {
    step: "STEP 03",
    color: "var(--data)",
    title: "Track",
    body:
      "Launch, monitor, and measure. Every campaign feeds the model — so the next recommendation is sharper than the last.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ═══ HERO ═══ */}
      <header className="section" style={{ paddingTop: 180, paddingBottom: 90, overflow: "hidden" }}>
        <div className="orb orb-violet" style={{ width: 680, height: 680, top: -160, left: -180 }} />
        <div className="orb orb-heat" style={{ width: 520, height: 520, top: 60, right: -160 }} />
        <div className="orb orb-data" style={{ width: 420, height: 420, bottom: -200, left: "40%" }} />
        <div className="grid-bg" style={{ height: "120%" }} />

        <div className="container rel center" style={{ maxWidth: 920 }}>
          <span className="eyebrow reveal" style={{ margin: "0 auto" }}>Creator Intelligence Platform</span>
          <h1 className="display reveal d1" style={{ marginTop: 28 }}>
            Discover<br />what <em>moves.</em>
          </h1>
          <p className="lead reveal d2" style={{ margin: "28px auto 0", maxWidth: 560 }}>
            Qulture is the precision layer for the creator economy — find, vet, and track the voices shaping culture before
            your competitors do. Signal over noise.
          </p>
          <div className="flex gap-s wrap reveal d3" style={{ justifyContent: "center", marginTop: 40 }}>
            <Link href="/login" className="btn btn-primary">
              Start discovering <ArrowIcon />
            </Link>
            <Link href="/insights" className="btn btn-ghost">Read the insights</Link>
          </div>

          <div className="flex gap-s wrap reveal d4" style={{ justifyContent: "center", marginTop: 56 }}>
            <span className="tag">TikTok</span>
            <span className="tag">Instagram</span>
            <span className="tag">YouTube</span>
            <span className="tag">Snapchat</span>
            <span className="tag" style={{ color: "var(--muted)", borderColor: "var(--border-2)", background: "transparent" }}>
              + more
            </span>
          </div>
        </div>
      </header>

      {/* ═══ STATS BAND ═══ */}
      <section style={{ borderBlock: "1px solid var(--border-2)", background: "var(--bg2)" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, paddingBlock: 0 }}>
          {stats.map((s, i) => (
            <div key={s.label} className={i === 0 ? "reveal" : `reveal d${i}`} style={{ padding: "44px 24px", textAlign: "center", ...s.style }}>
              <div className="display" style={{ fontSize: 46, color: s.color }}>{s.value}</div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="section" id="capabilities">
        <div className="container">
          <div style={{ maxWidth: 620, marginBottom: 64 }}>
            <span className="eyebrow reveal">What Qulture does</span>
            <h2 className="display reveal d1" style={{ marginTop: 22 }}>
              Not a database.<br />An <em>intelligence system.</em>
            </h2>
            <p className="lead reveal d2" style={{ marginTop: 20 }}>
              Four engineered capabilities, one precision layer. Every recommendation earned by signal — never by follower count.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
            {capabilities.map((c, i) => (
              <div key={c.title} className={i === 0 ? "card reveal" : `card reveal d${i}`}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 22,
                  }}
                >
                  {c.icon}
                </div>
                <h3 className="display" style={{ fontSize: 22 }}>{c.title}</h3>
                <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 15 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="section" style={{ background: "var(--bg2)", borderBlock: "1px solid var(--border-2)" }}>
        <div className="container">
          <div className="center" style={{ maxWidth: 560, margin: "0 auto 64px" }}>
            <span className="eyebrow reveal" style={{ margin: "0 auto" }}>How it works</span>
            <h2 className="display reveal d1" style={{ marginTop: 22 }}>
              From brief to booked<br />in <em>minutes.</em>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {steps.map((s, i) => (
              <div key={s.step} className={i === 0 ? "reveal" : `reveal d${i}`}>
                <div className="mono" style={{ color: s.color, fontSize: 13, letterSpacing: "0.1em" }}>{s.step}</div>
                <h3 className="display" style={{ fontSize: 24, marginTop: 14 }}>{s.title}</h3>
                <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 15 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA BAND ═══ */}
      <section className="section" style={{ overflow: "hidden" }}>
        <div className="orb orb-violet" style={{ width: 560, height: 560, top: -120, left: "50%", transform: "translateX(-50%)" }} />
        <div className="container rel center" style={{ maxWidth: 720 }}>
          <h2 className="display reveal">
            Culture moves fast.<br /><em>Move faster.</em>
          </h2>
          <p className="lead reveal d1" style={{ margin: "22px auto 0", maxWidth: 480 }}>
            Join the brands using Qulture to find the voices that move markets.
          </p>
          <div className="flex gap-s wrap reveal d2" style={{ justifyContent: "center", marginTop: 36 }}>
            <TallyCta />
            <Link href="/about" className="btn btn-ghost">Learn more</Link>
          </div>
        </div>
      </section>
    </>
  );
}
