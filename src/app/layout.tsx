import type { Metadata } from "next";
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
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
