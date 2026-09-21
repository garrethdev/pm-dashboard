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
  toolbarBelow = false,
  actions,
  headerAction,
  viewAllHref,
  sunken = false,
  glass = false,
  className,
  children,
}: {
  title: string;
  /** Filter/selector pills, rendered inline beside the title. */
  toolbar?: React.ReactNode;
  /** Put the toolbar on its own line under the title instead of beside it.
   *  For a card in a narrow column, where a segmented control next to the
   *  name leaves neither enough room (Garreth, 2026-09-22). */
  toolbarBelow?: boolean;
  /** Controls pinned to the right of the header row, before "View all". */
  actions?: React.ReactNode;
  /** The card's one way out — a CTA that behaves like "View all" does: paired
   *  with the title on a phone, at the end of the row on a desktop. Filters and
   *  counts are `actions` and stay below the title; this is not. */
  headerAction?: React.ReactNode;
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
      {/* On a phone the title and "View all" share the first line and the
          controls stack beneath, because the count pill, the filter dropdown
          and the link together are wider than a 375px card — pinned right and
          unbreakable, "View all" simply walked off the edge.

          Above `sm:` it collapses back to the one flat wrap row it has always
          been: `sm:contents` dissolves the mobile-only pairing so the header
          stays a single flex context, and `sm:order-last` returns the link to
          the end of it. Flat rather than nested groups so a narrow card wraps
          to two lines rather than three. */}
      <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
        <div className="flex items-center justify-between gap-3 sm:contents">
          {/* A step larger on a phone. At 14px the card's own name was quieter
              than everything it contained, so a scrolling reader lost track of
              which card they were in. */}
          <h2 className="min-w-0 truncate text-base font-medium text-text-muted sm:text-sm">
            {title}
          </h2>
          {headerAction && (
            <div className={cn("shrink-0 sm:order-last", !actions && "sm:ml-auto")}>
              {headerAction}
            </div>
          )}
          {viewAllHref && (
            <Link
              href={viewAllHref as never}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-text-muted/50 hover:text-text-primary sm:order-last",
                // Whichever of these lands first carries the auto margin that
                // pushes the whole right-hand cluster over.
                !actions && !headerAction && "sm:ml-auto",
              )}
            >
              View all <ChevronRight className="size-3" />
            </Link>
          )}
        </div>
        {!toolbarBelow && toolbar}
        {actions && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:ml-auto sm:shrink-0 sm:flex-nowrap">
            {actions}
          </div>
        )}
      </div>
      {toolbarBelow && toolbar}
      </div>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </Card>
  );
}
