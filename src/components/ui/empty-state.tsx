import { FillAncestors } from "@/components/ui/fill-ancestors";
import { cn } from "@/lib/utils";

/**
 * What a table or card shows when it has nothing to list (Garreth, 2026-09-18).
 *
 * An icon in a soft circle over one quiet line, the same as the Devices page's
 * "No phones yet". One line only: the app carries no instruction text. A bare
 * set of column headings over empty space reads as broken or still loading;
 * this reads as "nothing here yet".
 *
 * Design rule (Garreth, 2026-09-19): an empty list FILLS the vertical space
 * left on the page, so the card reaches the bottom of the screen with the
 * message centred in it, instead of a short card floating above a blank page.
 * The full-size version marks itself with `data-empty-fill`; the page frame
 * (app-shell.tsx) grows every ancestor that contains one. For that to reach
 * the message, each ancestor between the page and this component has to be a
 * flex column, which page roots and DashCard already are. Safari does not
 * re-check that CSS for streamed content, so `FillAncestors` sets the same
 * thing by hand once the page is live. The compact version
 * is for homepage cards, whose height is set by the dashboard grid.
 */
export function EmptyState({
  icon: Icon,
  children,
  compact = false,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  /** For a small card on the homepage rather than a full-page table. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      data-empty-fill={compact ? undefined : ""}
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "py-8" : "min-h-56 grow py-14",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-pill-bg text-text-muted",
          compact ? "size-10" : "size-12",
        )}
      >
        <Icon className={compact ? "size-5" : "size-6"} />
      </span>
      <p className="text-sm text-text-muted">{children}</p>
      {/* Safari needs the growing done by hand; see fill-ancestors.tsx. */}
      {!compact && <FillAncestors />}
    </div>
  );
}
