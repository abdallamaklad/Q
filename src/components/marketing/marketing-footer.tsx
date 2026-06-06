import Link from "next/link";
import { MarketingWordmark } from "./wordmark";
import { QuantaraLogo } from "./quantara-logo";

const QUANTARA_URL = "https://www.wearequantara.com";

/** Shared 4-column marketing footer + "Built by Quantara" lockup. */
export function MarketingFooter({ authed }: { authed: boolean }) {
  const dashHref = authed ? "/dashboard" : "/login";

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <MarketingWordmark size="sm" />
            <p>The discovery and campaign platform for the creator economy. Find what moves culture — and measure it.</p>
          </div>

          <div className="footer-col">
            <h4>Platform</h4>
            <Link href={dashHref}>Dashboard</Link>
            <Link href="/#capabilities">Discovery</Link>
            <Link href="/#capabilities">Vetting & Trust</Link>
            <Link href="/#capabilities">Campaign Tracking</Link>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <Link href="/about">About</Link>
            <Link href="/insights">Insights</Link>
            {/* Tally popup (embed.js loaded in the root layout intercepts this hash link). */}
            <a href="#tally-open=zxdZdq">Contact</a>
          </div>

          <div className="footer-col">
            <h4>Platforms</h4>
            <a href="#">TikTok</a>
            <a href="#">Instagram</a>
            <a href="#">YouTube</a>
            <a href="#">Snapchat</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Qulture — Discover what moves.</span>
          <a className="footer-quantara" href={QUANTARA_URL} target="_blank" rel="noopener noreferrer">
            Built by
            <QuantaraLogo size="sm" />
          </a>
        </div>
      </div>
    </footer>
  );
}
