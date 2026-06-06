import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

/**
 * Qulture wordmark for the marketing site: the geometric Q mark + "ulture".
 * Uses the `.mkt .wm*` classes (the marketing stylesheet sets stroke-width:12
 * and the −0.2em gap). `stroke="currentColor"` so it inherits the surrounding
 * color — works in both the brand-violet nav and white-on-gradient contexts.
 */
export function MarketingWordmark({
  size = "sm",
  className,
  style,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={cn("wm", `wm-${size}`, className)} style={style}>
      <span className="wm-q">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M 62 73 A 30 30 0 1 1 75 63" fill="none" stroke="currentColor" strokeLinecap="round" />
          <line x1="62" y1="73" x2="76" y2="87" stroke="currentColor" strokeLinecap="round" />
        </svg>
      </span>
      <span className="wm-text">ulture</span>
    </span>
  );
}
