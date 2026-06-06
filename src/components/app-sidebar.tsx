"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search, Copy, GitCompare, ListChecks, Megaphone, LineChart, ShieldAlert, Sparkles, Radio, DownloadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QWordmark } from "@/components/brand/logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LineChart },
  { href: "/search", label: "Discover", icon: Search },
  { href: "/lookalike", label: "Lookalikes", icon: Copy },
  { href: "/overlap", label: "Audience Overlap", icon: GitCompare },
  { href: "/share-of-voice", label: "Share of Voice", icon: Radio },
  { href: "/shortlists", label: "Shortlists", icon: ListChecks },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/fraud", label: "Fraud Signals", icon: ShieldAlert },
  { href: "/roadmap", label: "Roadmap", icon: Sparkles },
];

const ADMIN_NAV = [{ href: "/ingest", label: "Ingest Data", icon: DownloadCloud }];

export function AppSidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const nav = role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center border-b px-5">
        <QWordmark className="text-2xl" />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <p>Data source · <span className="text-primary">{process.env.NEXT_PUBLIC_DATA_PROVIDER ?? "mock"}</span></p>
        <p className="mt-1 opacity-70">A Quantara product</p>
      </div>
    </aside>
  );
}
