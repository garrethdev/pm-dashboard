"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface RowMenuItem {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  /** Retire: said in red, because it is the one that cannot be undone. */
  danger?: boolean;
}

/**
 * The ⋯ at the end of an account row (P14, Garreth 2026-09-23).
 *
 * The panel is FIXED to the window rather than hung off the row, because the
 * table sits in a sideways-scrolling box and anything positioned inside it is
 * cut off at that box's edge. It opens under the button, right-aligned to it,
 * and closes on a press outside, on Escape, and when the page scrolls — a
 * fixed panel left behind by a scroll would float over the wrong row.
 */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const outside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) close();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [at]);

  const toggle = () => {
    if (at) return setAt(null);
    const r = button.current?.getBoundingClientRect();
    if (r) setAt({ top: r.bottom + 6, right: window.innerWidth - r.right });
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(at)}
        className={cn(
          "flex size-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-card-raised hover:text-text-primary",
          at && "bg-card-raised text-text-primary",
        )}
      >
        <MoreVertical className="size-4" />
      </button>
      {at && (
        <div
          ref={panel}
          role="menu"
          style={{ top: at.top, right: at.right }}
          className="fixed z-40 flex min-w-44 flex-col gap-0.5 rounded-nested border border-border glass-overlay p-1.5 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setAt(null);
                item.onSelect();
              }}
              className={cn(
                "flex h-10 items-center gap-2.5 rounded-nested px-2.5 text-left text-sm transition-colors hover:bg-card-raised",
                item.danger ? "text-danger" : "text-text-primary",
              )}
            >
              <span className={cn("shrink-0", item.danger ? "text-danger" : "text-text-muted")}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
