import { cn } from "@/lib/utils";

/**
 * CSS-only hover tooltip.
 *
 * No JS and no positioning library: everything that needs one so far sits in a
 * table row of known height, and a floating-ui dependency to place a
 * twenty-pixel label would be the tail wagging the dog.
 *
 * `side` matters more than it looks. A table that scrolls horizontally computes
 * `overflow-y` to `auto` as well, so a tooltip placed above its trigger is
 * clipped by the scroll container rather than floating over it. Inside such a
 * table use "left", which stays within the row's own height.
 *
 * The group is named so it does not fire from an unrelated `group` further up.
 */
export function Tooltip({
  label,
  side = "top",
  className,
  children,
}: {
  label: string;
  side?: "top" | "left";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-20 rounded-nested border border-border glass-overlay px-2 py-1",
          "text-xs font-medium whitespace-nowrap text-text-primary opacity-0 shadow-card",
          "transition-opacity duration-100 group-hover/tt:opacity-100",
          side === "top"
            ? "bottom-full left-1/2 mb-1.5 -translate-x-1/2"
            : "top-1/2 right-full mr-1.5 -translate-y-1/2",
        )}
      >
        {label}
      </span>
    </span>
  );
}
