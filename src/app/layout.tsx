import type { Metadata } from "next";
import Script from "next/script";
import { Syne, Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Brand typography: Syne (display), Figtree (body/UI), JetBrains Mono (data/labels).
const display = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Qulture — Discover what moves.",
  description:
    "Creator intelligence, engineered. Discover, vet, and track influencers across 8 platforms — signal over noise. A Quantara product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${body.variable} ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        {/* Tally embed — powers the "Get in touch" lead-capture popup (form id zxdZdq)
            via [data-tally-open] and #tally-open= links. Loaded once for every route. */}
        <Script src="https://tally.so/widgets/embed.js" strategy="afterInteractive" />
        {/* Google Analytics (gtag.js) — loaded once for every route. */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-HHJESFE1RC" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-HHJESFE1RC');`}
        </Script>
      </body>
    </html>
  );
}
