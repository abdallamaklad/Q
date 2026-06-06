import { ImageResponse } from "next/og";
import { articles, getArticle } from "@/lib/marketing/insights";

export const alt = "Qulture insights article";
export const size = { width: 1200, height: 630 };

/**
 * Branded 1200×630 OG/Twitter image, served at a stable path
 * (`/insights/<slug>/og`) so it can be referenced from metadata AND JSON-LD.
 * Uses Next's built-in `next/og` (no extra dependency).
 */
export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  const title = article?.title ?? "Qulture Insights";
  const category = article?.category ?? "Insights";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#07070F",
          color: "#EEEEFF",
          backgroundImage:
            "radial-gradient(900px 600px at 100% 0%, rgba(155,92,255,0.32), rgba(7,7,15,0)), radial-gradient(700px 500px at 0% 100%, rgba(255,70,204,0.16), rgba(7,7,15,0))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#9B5CFF", letterSpacing: -1 }}>Qulture</div>
          <div style={{ display: "flex", fontSize: 22, color: "#9B5CFF", letterSpacing: 2, textTransform: "uppercase" }}>
            {category}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 70 ? 56 : 66,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -2,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, color: "#7878A0" }}>
          <div style={{ display: "flex" }}>Creator intelligence, engineered.</div>
          <div style={{ display: "flex" }}>qulture.tech</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
