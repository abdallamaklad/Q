import { Instagram, Youtube, Twitch, Facebook, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Icons for platforms lucide doesn't ship (tiktok, snapchat, x, pinterest) use a text glyph.
const ICONS: Partial<Record<string, LucideIcon>> = {
  instagram: Instagram,
  youtube: Youtube,
  twitch: Twitch,
  facebook: Facebook,
};

const LABEL: Record<string, string> = {
  instagram: "IG", tiktok: "TT", youtube: "YT", snapchat: "SC",
  twitch: "TW", facebook: "FB", x: "X", pinterest: "PIN",
};

const COLOR: Record<string, string> = {
  instagram: "text-pink-600", tiktok: "text-foreground", youtube: "text-red-600",
  snapchat: "text-yellow-500", twitch: "text-purple-600", facebook: "text-blue-600",
  x: "text-foreground", pinterest: "text-red-700",
};

export function PlatformBadge({ platform, className }: { platform: string; className?: string }) {
  const Icon = ICONS[platform];
  return (
    <span
      title={platform}
      className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded border px-1 text-[10px] font-bold", COLOR[platform], className)}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : LABEL[platform] ?? platform.slice(0, 2).toUpperCase()}
    </span>
  );
}
