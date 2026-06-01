import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformBadge } from "@/components/platform-badge";
import { QualityBadge } from "@/components/score-badge";
import { BadgeCheck, TrendingUp, TrendingDown } from "lucide-react";
import { formatCompact, formatPercent } from "@/lib/utils";
import type { CreatorSummary } from "@/lib/providers/types";

export function CreatorCard({
  creator,
  selectable,
  selected,
  onToggle,
}: {
  creator: CreatorSummary;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
}) {
  const initials = creator.name.split(" ").map((s) => s[0]).slice(0, 2).join("");
  return (
    <Card className="relative transition-shadow hover:shadow-md">
      {selectable && (
        <div className="absolute right-3 top-3 z-10">
          <Checkbox checked={selected} onCheckedChange={() => onToggle?.(creator.id)} aria-label="Select creator" />
        </div>
      )}
      <CardContent className="p-4">
        <Link href={`/creators/${creator.id}`} className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={creator.avatarUrl ?? undefined} alt={creator.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="truncate font-medium">{creator.name}</p>
              {creator.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-blue-600" />}
            </div>
            <p className="truncate text-xs text-muted-foreground">@{creator.handle}</p>
            <p className="truncate text-xs text-muted-foreground">{creator.location ?? "—"}</p>
          </div>
        </Link>

        <div className="mt-3 flex flex-wrap gap-1">
          {creator.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-semibold tabular-nums">{formatCompact(creator.followerTotal)}</p>
            <p className="text-[10px] uppercase text-muted-foreground">followers</p>
          </div>
          <div>
            <p className="text-sm font-semibold tabular-nums">{formatPercent(creator.engagementRate)}</p>
            <p className="text-[10px] uppercase text-muted-foreground">engagement</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-0.5 text-sm font-semibold tabular-nums">
              {creator.growthRate >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
              {formatPercent(Math.abs(creator.growthRate))}
            </p>
            <p className="text-[10px] uppercase text-muted-foreground">growth</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          {creator.categoryTags.slice(0, 3).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
          ))}
          {creator.score != null && (
            <Badge variant="outline" className="ml-auto text-[10px]">match {Math.round(creator.score * 100)}%</Badge>
          )}
        </div>
        {creator.aiGeneratedScore > 0.5 && (
          <div className="mt-2">
            <QualityBadge score={Math.round((1 - creator.aiGeneratedScore) * 100)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
