"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function CheckboxGroup<T extends string>({
  options,
  value = [],
  onChange,
  columns = 2,
  labels,
}: {
  options: readonly T[];
  value?: T[];
  onChange: (next: T[]) => void;
  columns?: number;
  labels?: Record<string, string>;
}) {
  const toggle = (opt: T) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className={cn("grid gap-1.5")} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {options.map((opt) => (
        <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm capitalize">
          <Checkbox checked={value.includes(opt)} onCheckedChange={() => toggle(opt)} />
          {labels?.[opt] ?? opt}
        </label>
      ))}
    </div>
  );
}
