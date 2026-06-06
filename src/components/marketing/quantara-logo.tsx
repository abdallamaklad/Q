import { cn } from "@/lib/utils";

/**
 * ⚠️ PLACEHOLDER — Quantara "cross-over" wordmark.
 * This is the reference placeholder SVG. Replace the entire <svg> markup below
 * with the official Quantara logo asset when available (keep the className API).
 */
export function QuantaraLogo({ size = "sm", className }: { size?: "sm" | "lg"; className?: string }) {
  return (
    <svg
      className={cn("qlockup", size === "lg" ? "qlockup-lg" : "qlockup-sm", className)}
      viewBox="0 0 2956 480"
      role="img"
      aria-label="Quantara — Cross over."
    >
      <g fill="none" stroke="#F5EFE6" strokeWidth="40" strokeLinecap="round">
        <path d="M 240,80 A 160,160 0 1 0 353,353" />
        <line x1="353" y1="353" x2="408" y2="408" />
      </g>
      <circle cx="240" cy="80" r="30" fill="#E8723C" />
      <g fill="#F5EFE6" transform="translate(550 380.4) scale(0.4 -0.4)">
        <path transform="translate(0, 0)" d="M562 -120 472 1Q432 -7 394 -7Q295 -7 212.5 39.0Q130 85 81.5 167.5Q33 250 33 353Q33 456 81.5 538.0Q130 620 212.5 666.0Q295 712 394 712Q493 712 575.5 666.0Q658 620 705.5 538.0Q753 456 753 353Q753 263 716.5 188.5Q680 114 615 65L769 -120ZM394 149Q478 149 528.5 205.0Q579 261 579 353Q579 446 528.5 501.5Q478 557 394 557Q309 557 258.5 502.0Q208 447 208 353Q208 260 258.5 204.5Q309 149 394 149Z" />
        <path transform="translate(828, 0)" d="M230 702V282Q230 219 261.0 185.0Q292 151 352 151Q412 151 444.0 185.0Q476 219 476 282V702H647V283Q647 189 607.0 124.0Q567 59 499.5 26.0Q432 -7 349 -7Q266 -7 200.5 25.5Q135 58 97.0 123.5Q59 189 59 283V702Z" />
        <path transform="translate(1573, 0)" d="M499 124H237L195 0H16L270 702H468L722 0H541ZM455 256 368 513 282 256Z" />
        <path transform="translate(2350, 0)" d="M690 0H519L233 433V0H62V702H233L519 267V702H690Z" />
        <path transform="translate(3142, 0)" d="M567 702V565H381V0H210V565H24V702Z" />
        <path transform="translate(3773, 0)" d="M499 124H237L195 0H16L270 702H468L722 0H541ZM455 256 368 513 282 256Z" />
        <path transform="translate(4550, 0)" d="M420 0 274 265H233V0H62V702H349Q432 702 490.5 673.0Q549 644 578.0 593.5Q607 543 607 481Q607 411 567.5 356.0Q528 301 451 278L613 0ZM233 386H339Q386 386 409.5 409.0Q433 432 433 474Q433 514 409.5 537.0Q386 560 339 560H233Z" />
        <path transform="translate(5242, 0)" d="M499 124H237L195 0H16L270 702H468L722 0H541ZM455 256 368 513 282 256Z" />
      </g>
    </svg>
  );
}
