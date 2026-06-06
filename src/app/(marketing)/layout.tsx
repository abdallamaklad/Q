import "../marketing.css";
import { getSessionContext } from "@/lib/rbac";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Reveal } from "@/components/marketing/reveal";

/**
 * Public marketing shell. Deliberately has NO `requireSession` — these pages are
 * public. We read the session defensively (any error, incl. an unreachable DB,
 * → `authed=false`) so the marketing site never 500s on a database hiccup and
 * renders locally without Postgres.
 */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  let authed = false;
  try {
    authed = (await getSessionContext()) != null;
  } catch {
    authed = false;
  }

  return (
    <div className="mkt noise">
      <MarketingNav authed={authed} />
      <main>{children}</main>
      <MarketingFooter authed={authed} />
      <Reveal />
    </div>
  );
}
