import { cn } from "@/lib/utils";

/**
 * Lead-capture CTA that opens the Tally popup (form id `zxdZdq`) as a modal.
 * Tally's embed.js (loaded once in the root layout) binds to the
 * `data-tally-open` attribute via event delegation, so this works as a plain
 * server-rendered button — no client JS needed. Styled with the shared
 * `.btn`/`.btn-primary` classes so it matches the rest of the site.
 */
export function TallyCta({
  label = "Get in touch with the Qulture team",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-tally-open="zxdZdq"
      data-tally-layout="modal"
      data-tally-width="540"
      className={cn("btn btn-primary", className)}
    >
      {label}
    </button>
  );
}
