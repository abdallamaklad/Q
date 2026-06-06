import type { Metadata } from "next";
import { QuantaraLogo } from "@/components/marketing/quantara-logo";
import { TallyCta } from "@/components/marketing/tally-cta";

export const metadata: Metadata = {
  title: "About — Qulture",
  description:
    "Qulture is the precision layer for the creator economy — engineered to find the voices shaping markets before anyone else does. A Quantara product.",
};

const QUANTARA_URL = "https://www.wearequantara.com";

const beliefs = [
  {
    label: "WHAT WE BELIEVE",
    color: "var(--brand)",
    title: "Signal over noise",
    body:
      "The internet is full of follower counts. We cut to what actually drives decisions — audience quality, content authenticity, engagement reality. We don't surface creators. We surface the right ones.",
  },
  {
    label: "HOW WE BUILD",
    color: "var(--heat)",
    title: "Engineered to compound",
    body:
      "Every campaign informs the next. Qulture brings the same data discipline to creator discovery that Quantara brings to growth — systems over tactics, intelligence over guessing.",
  },
];

const stats = [
  { value: "90M+", label: "CREATORS INDEXED", color: "var(--brand)", style: {} },
  { value: "8", label: "PLATFORMS", color: "var(--white)", style: { borderInline: "1px solid var(--border-2)" } },
  { value: "50+", label: "FILTERS", color: "var(--white)", style: { borderRight: "1px solid var(--border-2)" } },
  { value: "Global", label: "EVERY MARKET", color: "var(--white)", style: {} },
];

export default function AboutPage() {
  return (
    <>
      {/* ═══ HERO ═══ */}
      <header className="section" style={{ paddingTop: 180, paddingBottom: 60, overflow: "hidden" }}>
        <div className="orb orb-violet" style={{ width: 600, height: 600, top: -180, left: -140 }} />
        <div className="grid-bg" style={{ height: "130%" }} />
        <div className="container rel" style={{ maxWidth: 840 }}>
          <span className="eyebrow reveal">About Qulture</span>
          <h1 className="display reveal d1" style={{ marginTop: 24 }}>
            <span style={{ color: "var(--brand)" }}>Q</span>ulture doesn&apos;t<br />ask <em>permission.</em>
          </h1>
          <p className="lead reveal d2" style={{ marginTop: 24, maxWidth: 620 }}>
            It spreads. It shifts. It converts — before the algorithm even notices. Qulture exists to map that movement: the
            precision layer for the creator economy, engineered to find the voices shaping markets before anyone else does.
          </p>
        </div>
      </header>

      {/* ═══ BELIEF ═══ */}
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
            {beliefs.map((b, i) => (
              <div key={b.title} className={i === 0 ? "card reveal" : "card reveal d1"}>
                <span className="mono" style={{ color: b.color, fontSize: 12, letterSpacing: "0.1em" }}>{b.label}</span>
                <h3 className="display" style={{ fontSize: 24, marginTop: 16 }}>{b.title}</h3>
                <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 15 }}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section style={{ borderBlock: "1px solid var(--border-2)", background: "var(--bg2)" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1 }}>
          {stats.map((s, i) => (
            <div key={s.label} className={i === 0 ? "reveal" : `reveal d${i}`} style={{ padding: "44px 20px", textAlign: "center", ...s.style }}>
              <div className="display" style={{ fontSize: 42, color: s.color }}>{s.value}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ BUILT BY QUANTARA ═══ */}
      <section className="section" style={{ overflow: "hidden" }}>
        <div className="orb orb-violet" style={{ width: 480, height: 480, top: -100, right: -120 }} />
        <div className="container rel">
          <div
            className="card reveal"
            style={{ padding: 64, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", background: "var(--bg2)" }}
          >
            <div>
              <span className="eyebrow">The Quantara family</span>
              <h2 className="display" style={{ fontSize: "clamp(28px,3.5vw,42px)", marginTop: 22 }}>
                Built by <em>Quantara.</em>
              </h2>
              <p style={{ color: "var(--muted)", marginTop: 18, fontSize: 16, lineHeight: 1.7 }}>
                Qulture is a Quantara product — engineered on the same growth infrastructure that powers Quantara&apos;s work
                in ads, automation, and commerce. Same discipline. Same precision. Pointed at the creator economy.
              </p>
              <a href={QUANTARA_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ marginTop: 28 }}>
                Visit Quantara
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M5 11L11 5M6 5h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                padding: 48,
                background: "var(--bg)",
                border: "1px solid var(--border-2)",
                borderRadius: 16,
              }}
            >
              <QuantaraLogo size="lg" />
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.14em" }}>CROSS OVER.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CONTACT ═══ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container center" style={{ maxWidth: 620 }}>
          <span className="eyebrow reveal" style={{ margin: "0 auto" }}>Get in touch</span>
          <h2 className="display reveal d1" style={{ marginTop: 22 }}>Let&apos;s talk.</h2>
          <p className="lead reveal d2" style={{ margin: "18px auto 0", maxWidth: 440 }}>
            Questions, partnerships, or press — reach the Qulture team directly.
          </p>
          <div className="flex gap-s wrap reveal d3" style={{ justifyContent: "center", alignItems: "center", marginTop: 32 }}>
            <TallyCta />
            <a href="mailto:qulture@wearequantara.com" className="btn btn-ghost">
              qulture@wearequantara.com
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
