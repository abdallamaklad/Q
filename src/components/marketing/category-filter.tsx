"use client";
import { useState } from "react";
import Link from "next/link";
import { accentVar, gridArticles, filterCategories, type Article } from "@/lib/marketing/insights";

/**
 * Client-side Insights explorer: category filter pills + the article grid.
 * Cards link to their full article. Grid cards are always visible (no
 * scroll-reveal) so re-filtering never leaves freshly-shown cards stuck in the
 * hidden reveal state. Filters by `category` (= articleSection).
 */
export function CategoryFilter() {
  const [active, setActive] = useState<(typeof filterCategories)[number]>("All");
  const visible = active === "All" ? gridArticles : gridArticles.filter((a) => a.category === active);

  return (
    <>
      <div className="flex gap-s wrap" role="tablist" aria-label="Filter articles by category" style={{ marginBottom: 32 }}>
        {filterCategories.map((cat) => {
          const isActive = cat === active;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isActive}
              className="tag"
              onClick={() => setActive(cat)}
              style={
                isActive
                  ? { color: "#fff", background: "var(--brand)", borderColor: "var(--brand)", cursor: "pointer" }
                  : { color: "var(--muted)", borderColor: "var(--border-2)", background: "transparent", cursor: "pointer" }
              }
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
        {visible.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>
    </>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/insights/${article.slug}`} aria-label={article.title}>
      <article className="card" style={{ padding: 0, overflow: "hidden", height: "100%" }}>
        <div style={{ height: 160, background: article.cover }} />
        <div style={{ padding: 26 }}>
          <span className="mono" style={{ color: accentVar[article.accent], fontSize: 11, letterSpacing: "0.08em" }}>
            {article.category.toUpperCase()} · {article.readMin} MIN
          </span>
          <h3 className="display" style={{ fontSize: 20, marginTop: 14, lineHeight: 1.2 }}>{article.title}</h3>
          <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 14 }}>{article.excerpt}</p>
        </div>
      </article>
    </Link>
  );
}
