"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type SortDir = "desc" | "asc";

export function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  const Icon = active ? (dir === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        active
          ? dir === "desc"
            ? "Highest first, click for lowest"
            : "Lowest first, click to reset"
          : "sort by this column"
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
        active ? "bg-accent-soft text-accent" : "text-text-muted hover:text-text-primary",
      )}
    >
      {label} <Icon className={cn("size-3", !active && "opacity-60")} />
    </button>
  );
}

/**
 * The cycle used by all sorters: biggest first, then smallest, then off.
 *
 * `first` flips which end a fresh column opens on. Countdown columns want the
 * smallest value first — on "days left", the rows about to expire are the whole
 * reason you clicked — where every other column reads as a ranking and wants
 * the largest.
 */
export function cycleSort<K extends string>(
  current: { key: K; dir: SortDir } | null,
  key: K,
  first: SortDir = "desc",
): { key: K; dir: SortDir } | null {
  if (current?.key !== key) return { key, dir: first };
  return current.dir === first ? { key, dir: first === "desc" ? "asc" : "desc" } : null;
}
