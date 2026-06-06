"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarketingWordmark } from "./wordmark";

/**
 * Fixed marketing nav with a mobile hamburger toggle. Auth-aware: the server
 * layout passes `authed`, which decides whether "Dashboard"/CTA point at the
 * app (`/dashboard`) or the sign-in screen (`/login`). Active link is derived
 * from the pathname (the nav lives in the persistent layout).
 */
export function MarketingNav({ authed }: { authed: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dashHref = authed ? "/dashboard" : "/login";
  const close = () => setOpen(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="nav" aria-label="Primary">
      <Link href="/" aria-label="Qulture home" onClick={close}>
        <MarketingWordmark size="sm" />
      </Link>

      <div className={open ? "nav-links open" : "nav-links"}>
        <Link href="/" className={isActive("/") ? "active" : undefined} onClick={close}>Home</Link>
        <Link href="/insights" className={isActive("/insights") ? "active" : undefined} onClick={close}>Insights</Link>
        <Link href={dashHref} onClick={close}>Dashboard</Link>
        <Link href="/about" className={isActive("/about") ? "active" : undefined} onClick={close}>About</Link>
        <Link href={dashHref} className="nav-cta" onClick={close}>
          {authed ? "Open app" : "Sign in"}
        </Link>
      </div>

      <button
        type="button"
        className="nav-toggle"
        aria-label="Toggle menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>
    </nav>
  );
}
