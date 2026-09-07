"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/** Click-to-open popover anchored to a trigger button, with click-outside close. */
export function Dropdown({
  label,
  icon,
  badge,
  align = "left",
  className,
  panelClassName,
  children,
}: {
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: number;
  align?: "left" | "right";
  className?: string;
  panelClassName?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-card-raised px-3.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-primary",
          open && "text-text-primary",
          className,
        )}
      >
        {icon}
        {label}
        {badge != null && badge > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-bg">
            {badge}
          </span>
        )}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full z-30 mt-2 min-w-52 rounded-nested border border-border bg-card p-3 shadow-card",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
