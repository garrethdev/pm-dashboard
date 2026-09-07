import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Bare card surface.
 *
 * `glass` is the lit treatment from the 2026-09-07 overhaul: a translucent fill
 * that borrows the page glow, with an inset top-edge highlight standing in for
 * a light source above. It only reads on a varied background, which is why the
 * glow layer on the content column is a prerequisite and not decoration.
 *
 * `hero` applies the one-per-page accent gradient treatment.
 *
 * `sunken` drops the card a step toward the page ground. It is for a card whose
 * own surface is chrome and whose CONTENT carries the weight — the calendar
 * grid, where the day cells are the thing being read. cn() is plain clsx with
 * no tailwind-merge, so this picks the background rather than layering a second
 * bg-* class and leaving stylesheet order to decide.
 */
export function Card({
  hero = false,
  sunken = false,
  glass = false,
  className,
  children,
}: {
  hero?: boolean;
  sunken?: boolean;
  glass?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card p-5",
        hero
          ? "border border-accent/40 bg-linear-135 from-accent to-accent-deep shadow-hero"
          : glass
            ? "glass"
            : cn("border border-border shadow-card", sunken ? "bg-card-sunken" : "bg-card"),
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Dashboard section card — header row with title and "View all ›", body below.
 * `fetchedAt` is still accepted (the data layer stamps it) but not displayed —
 * Garreth removed the timestamp 2026-08-31; re-render it here if that changes.
 */
export function DashCard({
  title,
  toolbar,
  actions,
  viewAllHref,
  sunken = false,
  glass = false,
  className,
  children,
}: {
  title: string;
  /** Filter/selector pills, rendered inline beside the title. */
  toolbar?: React.ReactNode;
  /** Controls pinned to the right of the header row, before "View all". */
  actions?: React.ReactNode;
  fetchedAt?: string;
  viewAllHref?: string;
  /** Recede toward the page ground — see Card. */
  sunken?: boolean;
  /** Lit translucent surface — see Card. */
  glass?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  // gap-6: 24px between the card title row and its content (Garreth 2026-09-02)
  // — tables need room to breathe under their title/filter row.
  return (
    <Card sunken={sunken} glass={glass} className={cn("flex flex-col gap-5", className)}>
      {/* One flat wrap row: title, its pills, then the right-hand controls.
          Flat rather than nested groups so a narrow card wraps to two lines
          (title / pills + controls) instead of three. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="truncate text-sm font-medium text-text-muted">{title}</h2>
        {toolbar}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {actions}
          {viewAllHref && (
            <Link
              href={viewAllHref as never}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-text-muted/50 hover:text-text-primary"
            >
              View all <ChevronRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </Card>
  );
}
