import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  SITE_URL,
  accentVar,
  articles,
  getArticle,
  relatedArticles,
  readingTime,
  formatDate,
} from "@/lib/marketing/insights";
import { articleBodies } from "@/lib/marketing/articles";
import { TallyCta } from "@/components/marketing/tally-cta";

type Params = { slug: string };

/** Pre-render every article at build time. */
export function generateStaticParams(): Params[] {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};

  const url = `${SITE_URL}/insights/${slug}`;
  const ogImage = `${url}/og`;
  return {
    title: article.seoTitle,
    description: article.seoDescription,
    keywords: article.keywords,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        // "ar": `${SITE_URL}/ar/insights/${slug}`, // TODO: add when an Arabic (ar) translation ships
        "x-default": url,
      },
    },
    openGraph: {
      type: "article",
      title: article.seoTitle,
      description: article.seoDescription,
      url,
      siteName: "Qulture",
      publishedTime: article.date,
      modifiedTime: article.updated ?? article.date,
      section: article.category,
      authors: ["Qulture Team"],
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle,
      description: article.seoDescription,
      images: [ogImage],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  const bodyContent = articleBodies[slug];
  if (!article || !bodyContent) notFound();

  const url = `${SITE_URL}/insights/${slug}`;
  const related = relatedArticles(slug);

  // BlogPosting structured data. author = Qulture (Organization), publisher = Quantara.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.seoDescription,
    datePublished: article.date,
    dateModified: article.updated ?? article.date,
    inLanguage: "en",
    image: `${url}/og`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: article.category,
    keywords: article.keywords.join(", "),
    author: { "@type": "Organization", name: "Qulture", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "Quantara",
      url: "https://www.wearequantara.com",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ═══ ARTICLE HERO ═══ */}
      <header className="article-hero">
        <div className="orb orb-violet" style={{ width: 520, height: 520, top: -180, right: -140 }} />
        <div className="grid-bg" style={{ height: "120%" }} />
        <div className="container rel" style={{ maxWidth: 760 }}>
          <Link href="/insights" className="mono" style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.06em" }}>
            ← All insights
          </Link>
          <div style={{ marginTop: 18 }}>
            <span className="tag" style={{ color: accentVar[article.accent], borderColor: "var(--border)" }}>
              {article.category}
            </span>
          </div>
          <h1 className="display" style={{ fontSize: "clamp(30px,4.5vw,52px)", marginTop: 20 }}>
            {article.title}
          </h1>
          <div className="article-meta">
            <span>By Qulture Team</span>
            <span className="dot">·</span>
            <time dateTime={article.date}>{formatDate(article.date)}</time>
            <span className="dot">·</span>
            <span>{readingTime(article)}</span>
          </div>
        </div>
      </header>

      {/* ═══ BODY ═══ */}
      <article className="section" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="article">{bodyContent}</div>
        </div>
      </article>

      {/* ═══ CLOSING CTA ═══ */}
      <section style={{ paddingBottom: 80 }}>
        <div className="container">
          <div
            className="card center"
            style={{ maxWidth: 760, margin: "0 auto", padding: "48px 40px", background: "var(--bg2)" }}
          >
            <h2 className="display" style={{ fontSize: "clamp(24px,3vw,32px)" }}>
              Put this into practice with <em>Qulture.</em>
            </h2>
            <p className="lead" style={{ margin: "16px auto 28px", maxWidth: 460 }}>
              Discover, vet, and track the creators moving culture across MENA — signal over noise.
            </p>
            <div className="flex gap-s wrap" style={{ justifyContent: "center" }}>
              <TallyCta />
              <Link href="/dashboard" className="btn btn-ghost">Explore the platform</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ RELATED ═══ */}
      {related.length > 0 && (
        <section className="section" style={{ paddingTop: 0, paddingBottom: 96 }}>
          <div className="container">
            <h2 className="display" style={{ fontSize: 24, marginBottom: 24 }}>Related reading</h2>
            <div className="article-related">
              {related.map((r) => (
                <Link key={r.slug} href={`/insights/${r.slug}`} aria-label={r.title}>
                  <article className="card" style={{ padding: 0, overflow: "hidden", height: "100%" }}>
                    <div style={{ height: 120, background: r.cover }} />
                    <div style={{ padding: 22 }}>
                      <span className="mono" style={{ color: accentVar[r.accent], fontSize: 11, letterSpacing: "0.08em" }}>
                        {r.category.toUpperCase()} · {r.readMin} MIN
                      </span>
                      <h3 className="display" style={{ fontSize: 18, marginTop: 12, lineHeight: 1.25 }}>{r.title}</h3>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
