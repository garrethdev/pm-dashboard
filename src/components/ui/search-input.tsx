"use client";

import { Search, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/** Inline search field for detail-page tables. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-border bg-card-raised px-3.5 py-1.5",
        className,
      )}
    >
      <Search className="size-3.5 shrink-0 text-text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Clear"
          className="shrink-0 text-text-muted hover:text-text-primary"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
