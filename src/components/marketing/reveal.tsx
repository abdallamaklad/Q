"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reveal-on-scroll: adds `.in` to every `.mkt .reveal` element as it enters the
 * viewport (replaces the reference's inline script). Re-runs on client-side route
 * changes (keyed on pathname) since the marketing layout persists across them.
 * Respects prefers-reduced-motion.
 */
export function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".mkt .reveal"));
    if (els.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
