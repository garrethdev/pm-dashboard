"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The filters currently applied, shown outside the dropdown that set them.
 *
 * A count badge on the Filters button says how many are on but not which, so
 * the only way to find out was to open the dropdown — and a filtered table with
 * the dropdown closed looks the same as a table with no matches. Each chip
 * names one filter and clears just that one; "Clear filters" drops the lot.
 */
export interface FilterChip {
  /** Stable key — the filter's field, not its value. */
  key: string;
  /** What the reader sees, e.g. "Char 3" or "Paused". */
  label: string;
  onClear: () => void;
}

export function FilterChips({
  chips,
  onClearAll,
  className,
}: {
  chips: FilterChip[];
  onClearAll: () => void;
  className?: string;
}) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pr-1 pl-2.5 text-xs font-medium whitespace-nowrap text-accent"
        >
          {c.label}
          <button
            type="button"
            onClick={c.onClear}
            aria-label={`Remove ${c.label} filter`}
            className="rounded-full p-0.5 text-accent/70 transition-colors hover:bg-accent/15 hover:text-accent"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium whitespace-nowrap text-text-muted transition-colors hover:text-text-primary"
      >
        Clear filters
      </button>
    </div>
  );
}
