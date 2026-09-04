"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
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
            ? "highest first — click for lowest first"
            : "lowest first — click to reset"
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

/** desc → asc → off cycle used by all sorters. */
export function cycleSort<K extends string>(
  current: { key: K; dir: SortDir } | null,
  key: K,
): { key: K; dir: SortDir } | null {
  if (current?.key !== key) return { key, dir: "desc" };
  return current.dir === "desc" ? { key, dir: "asc" } : null;
}
