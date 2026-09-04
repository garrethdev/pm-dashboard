"use client";

import { cn } from "@/lib/utils";

/** Segmented pill filter (reference style: "Monthly / Yearly" toggle). */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-0.5 rounded-full bg-card-raised p-0.5",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
            value === o.value
              ? "bg-accent font-medium text-bg"
              : "text-text-muted hover:text-text-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
