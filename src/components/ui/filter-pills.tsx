"use client";

import { cn } from "@/lib/utils";

/** Segmented pill filter (reference style: "Monthly / Yearly" toggle). */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  inline = false,
  className,
}: {
  /** `marked` puts a dot on the pill — used for "this one is not on the
   *  default" (a character with its own cadence). Optional and additive; every
   *  existing caller is unaffected.
   *
   *  `icon` sits before the label, for a switch whose options are a shape
   *  rather than a name — the To-do page's Grid / List (Garreth, 2026-09-22).
   *  Also additive. */
  options: { value: T; label: string; marked?: boolean; icon?: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  /** Sit beside other content instead of claiming its own full-width row.
   *  For a switch that belongs next to a heading; it still scrolls sideways
   *  rather than pushing the heading off the screen. */
  inline?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Full width on a phone, hugging its content from `sm:` up. A segmented
        // control that ends halfway across a card reads as a stray pill rather
        // than as the card's own switch.
        //
        // Scrolls sideways once the labels stop fitting — four options like
        // "All 29 / Blocked 3 / Throttled 6 / Full cadence" are wider than a
        // 375px card, and spilling past the pill's own edge looked broken where
        // scrolling inside it reads as more to see.
        "no-scrollbar flex items-center gap-0.5 overflow-x-auto rounded-full bg-card-raised p-0.5",
        inline
          ? "w-fit max-w-full min-w-0 shrink"
          : "w-full sm:inline-flex sm:w-fit sm:overflow-visible",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            // `flex-auto`, not `flex-1`: equal thirds would squeeze "Needs
            // attention" below its own text and push the row past the card,
            // where growing proportionally fills the same space and still fits.
            "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
            // An icon needs the label beside it rather than under it, so the
            // pill becomes a row only when there is one to place.
            o.icon ? "inline-flex items-center justify-center gap-1.5" : "",
            inline ? "shrink-0" : "flex-auto sm:flex-none",
            value === o.value
              ? "bg-accent font-medium text-bg"
              : "text-text-muted hover:text-text-primary",
          )}
        >
          {o.icon}
          {o.label}
          {o.marked && (
            <span
              className={cn(
                "ml-1",
                // Amber reads on the muted ground but disappears against the
                // accent fill, so the selected pill marks itself with its own
                // text colour instead of a second hue.
                value === o.value ? "opacity-70" : "text-warn",
              )}
            >
              •
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
