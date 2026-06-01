import { cn } from "@/lib/utils";

/**
 * Qulture "Q" mark — a custom geometric open-ring + tail forming a lens shape.
 * Inherits color via currentColor. Size it with width/height utilities.
 */
export function QMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("text-primary", className)} fill="none" aria-hidden="true">
      <path d="M 62 73 A 30 30 0 1 1 75 63" stroke="currentColor" strokeWidth={9} strokeLinecap="round" />
      <line x1="62" y1="73" x2="76" y2="87" stroke="currentColor" strokeWidth={9} strokeLinecap="round" />
    </svg>
  );
}

/**
 * Full Qulture wordmark: the Q mark followed by "ulture" set in Syne ExtraBold.
 * The mark is ~1.35× the text size and tucks slightly into the letters.
 * Pass `className` to control font-size and color (defaults to brand violet).
 */
export function QWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-display font-bold leading-none tracking-[-0.04em] text-primary",
        className
      )}
    >
      <QMark className="h-[1.35em] w-[1.35em] -mr-[0.16em]" />
      <span>ulture</span>
    </span>
  );
}
