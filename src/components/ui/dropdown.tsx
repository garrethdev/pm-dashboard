"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Click-to-open popover anchored to a trigger button, with click-outside close.
 *
 * Below `sm:` the panel is centred on the viewport rather than hung off the
 * trigger. Anchoring is a desktop idea: a ~320px panel pinned to a button
 * halfway across a 375px screen puts half of itself past the edge, whichever
 * side it is aligned to. `align` therefore only describes the desktop layout.
 */
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
  /** Which edge of the trigger the panel hangs from, from `sm:` up. */
  align?: "left" | "right";
  className?: string;
  panelClassName?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  /** The phone panel is fixed, so it has to be told how far down to sit. */
  const [top, setTop] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const place = () => {
      if (ref.current) setTop(ref.current.getBoundingClientRect().bottom + 8);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          // Measured on the way in, so the panel's first paint is already in
          // the right place.
          if (ref.current) setTop(ref.current.getBoundingClientRect().bottom + 8);
          setOpen((o) => !o);
        }}
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
          // The measured offset rides a custom property rather than `top`
          // directly: an inline `top` would beat the `sm:top-full` below it and
          // leave the desktop panel floating at a phone's coordinate.
          style={{ "--dd-top": `${top}px` } as React.CSSProperties}
          className={cn(
            "z-30 rounded-nested border border-border glass-overlay p-3",
            "fixed top-[var(--dd-top)] left-1/2 w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2",
            "sm:absolute sm:top-full sm:mt-2 sm:w-auto sm:max-w-none sm:min-w-52 sm:translate-x-0",
            align === "right" ? "sm:right-0 sm:left-auto" : "sm:right-auto sm:left-0",
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
