"use client";
import type { CreatorFilters } from "@/lib/search/filters";
import { PLATFORMS, AGE_BUCKETS, GENDERS } from "@/lib/search/filters";
import { CATEGORY_OPTIONS, COUNTRY_OPTIONS, LANGUAGE_OPTIONS, INTEREST_OPTIONS } from "@/lib/search/options";
import { CheckboxGroup } from "@/components/checkbox-group";
import { TagInput } from "@/components/tag-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type F = Partial<CreatorFilters>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange, placeholder }: { label: string; value?: number; onChange: (v?: number) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="h-8"
      />
    </div>
  );
}

export function FiltersPanel({ value, onChange, onReset }: { value: F; onChange: (next: F) => void; onReset: () => void }) {
  const set = <K extends keyof F>(key: K, v: F[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Filters</p>
        <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>
      </div>

      <Section title="Platforms">
        <CheckboxGroup options={PLATFORMS} value={value.platforms} onChange={(v) => set("platforms", v)} columns={2} />
      </Section>
      <Separator />

      <Section title="Audience size & performance">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Followers min" value={value.followersMin} onChange={(v) => set("followersMin", v)} placeholder="0" />
          <NumberField label="Followers max" value={value.followersMax} onChange={(v) => set("followersMax", v)} placeholder="∞" />
          <NumberField label="Engagement % min" value={value.engagementMin} onChange={(v) => set("engagementMin", v)} />
          <NumberField label="Engagement % max" value={value.engagementMax} onChange={(v) => set("engagementMax", v)} />
          <NumberField label="Growth % min" value={value.growthMin} onChange={(v) => set("growthMin", v)} />
          <NumberField label="Growth % max" value={value.growthMax} onChange={(v) => set("growthMax", v)} />
        </div>
      </Section>
      <Separator />

      <Section title="Categories">
        <CheckboxGroup options={CATEGORY_OPTIONS} value={value.categories} onChange={(v) => set("categories", v)} columns={2} />
      </Section>
      <Separator />

      <Section title="Keywords, hashtags & mentions">
        <Label className="text-xs">Caption keywords</Label>
        <TagInput value={value.keywords} onChange={(v) => set("keywords", v)} placeholder="add keyword…" />
        <Label className="text-xs">Hashtags</Label>
        <TagInput value={value.hashtags} onChange={(v) => set("hashtags", v)} placeholder="#tag…" />
        <Label className="text-xs">Brand mentions</Label>
        <TagInput value={value.brandMentions} onChange={(v) => set("brandMentions", v)} placeholder="@brand…" />
      </Section>
      <Separator />

      <Section title="Geography & language">
        <Label className="text-xs">Creator country</Label>
        <CheckboxGroup options={COUNTRY_OPTIONS} value={value.countries} onChange={(v) => set("countries", v)} columns={1} />
        <Label className="text-xs">Languages</Label>
        <CheckboxGroup options={LANGUAGE_OPTIONS} value={value.languages} onChange={(v) => set("languages", v)} columns={2} />
      </Section>
      <Separator />

      <Section title="Audience demographics">
        <Label className="text-xs">Gender skew</Label>
        <div className="flex items-center gap-2">
          <Select value={value.audienceGender ?? "any"} onValueChange={(v) => set("audienceGender", v === "any" ? undefined : (v as CreatorFilters["audienceGender"]))}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {GENDERS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <NumberField label="min share (0-1)" value={value.audienceGenderMinShare} onChange={(v) => set("audienceGenderMinShare", v)} placeholder="0.5" />
        </div>
        <Label className="text-xs">Age buckets</Label>
        <CheckboxGroup options={AGE_BUCKETS} value={value.audienceAgeBuckets} onChange={(v) => set("audienceAgeBuckets", v)} columns={3} />
        <NumberField label="Age min share (0-1)" value={value.audienceAgeMinShare} onChange={(v) => set("audienceAgeMinShare", v)} placeholder="0.3" />
        <Label className="text-xs">Audience countries</Label>
        <CheckboxGroup options={COUNTRY_OPTIONS} value={value.audienceCountries} onChange={(v) => set("audienceCountries", v)} columns={1} />
        <NumberField label="Audience country min share (0-1)" value={value.audienceCountryMinShare} onChange={(v) => set("audienceCountryMinShare", v)} />
        <Label className="text-xs">Audience interests</Label>
        <CheckboxGroup options={INTEREST_OPTIONS} value={value.audienceInterests} onChange={(v) => set("audienceInterests", v)} columns={2} />
        <NumberField label="Interest min share (0-1)" value={value.audienceInterestMinShare} onChange={(v) => set("audienceInterestMinShare", v)} />
      </Section>
      <Separator />

      <Section title="Content timeframe">
        <div className="grid grid-cols-1 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Posted since</Label>
            <Input type="date" className="h-8" value={value.contentSince?.slice(0, 10) ?? ""} onChange={(e) => set("contentSince", e.target.value ? new Date(e.target.value).toISOString() : undefined)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Posted until</Label>
            <Input type="date" className="h-8" value={value.contentUntil?.slice(0, 10) ?? ""} onChange={(e) => set("contentUntil", e.target.value ? new Date(e.target.value).toISOString() : undefined)} />
          </div>
        </div>
      </Section>
      <Separator />

      <Section title="Quality & fraud gates">
        <NumberField label="Max fake-follower score (0-100)" value={value.maxFakeFollowerScore} onChange={(v) => set("maxFakeFollowerScore", v)} />
        <NumberField label="Min audience quality (0-100)" value={value.minAudienceQuality} onChange={(v) => set("minAudienceQuality", v)} />
        <NumberField label="Max AI-generated score (0-1)" value={value.maxAiGeneratedScore} onChange={(v) => set("maxAiGeneratedScore", v)} />
        <label className="flex items-center justify-between text-sm"><span>Verified only</span><Switch checked={!!value.verifiedOnly} onCheckedChange={(c) => set("verifiedOnly", c)} /></label>
        <label className="flex items-center justify-between text-sm"><span>Exclude suspected pods</span><Switch checked={!!value.excludeSuspectedPods} onCheckedChange={(c) => set("excludeSuspectedPods", c)} /></label>
      </Section>
    </div>
  );
}
