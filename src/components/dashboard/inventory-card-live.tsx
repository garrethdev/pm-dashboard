import { BarcodeBar } from "@/components/ui/barcode-bar";
import { DashCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Package } from "@/components/ui/icons";
import { getInventory } from "@/lib/data/inventory";
import type { Fleet } from "@/lib/fleet";
import { formatEtShort } from "@/lib/data/format";
import { upstreamMessage } from "@/lib/data/upstream-error";

export function coverColor(days: number): string {
  if (days < 3) return "bg-danger";
  if (days < 7) return "bg-warn";
  return "bg-ok";
}

export function coverLabel(days: number): string {
  if (days >= 14) return "2+ w";
  return `${Math.round(days)} d`;
}

/** Homepage inventory card — days-of-cover per character × bucket, live.
 *
 *  The `try` guards the read only — see the note in accounts/page.tsx. */
export async function InventoryCardLive({
  className,
  fleet,
}: {
  className?: string;
  /** Passed in by the page rather than read here: this file also exports
   *  coverColor / coverLabel to browser-side cards, so it must not import
   *  anything server-only (the cookie reader is). */
  fleet: Fleet;
}) {
  let data;
  let fetchedAt;
  try {
    ({ data, fetchedAt } = await getInventory(fleet));
  } catch (err) {
    return (
      <DashCard title="Inventory" viewAllHref="/inventory" className={className}>
        <p className="text-sm text-text-muted">{upstreamMessage(err, "Supabase")}</p>
      </DashCard>
    );
  }

  return (
    <DashCard
      title="Inventory"
      fetchedAt={formatEtShort(fetchedAt)}
      viewAllHref="/inventory"
      className={className}
    >
      {/* A column the height of the card, so the total is pinned to the bottom
          edge whether there is demand to list or not (Garreth, 2026-09-22). */}
      <div className="flex h-full min-h-0 flex-col gap-4">
      {data.buckets.length === 0 && (
        <EmptyState icon={Package} compact className="flex-1">
          No demand yet
        </EmptyState>
      )}
      <div hidden={data.buckets.length === 0} className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-text-muted">
          <span className="w-28 shrink-0" />
          <span className="flex-1" />
          <span className="w-12 shrink-0 text-right">Cover</span>
          <span className="w-14 shrink-0 text-right">Produce</span>
        </div>
        {data.buckets.map((b) => (
          <div key={`${b.character}-${b.bucket}`} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-[13px] text-text-muted">
              {b.character.replace("Character ", "Char ")}, {b.bucket === "glp" ? "GLP" : "Filler"}
            </span>
            <BarcodeBar
              pct={(Math.min(b.daysOfCover, 14) / 14) * 100}
              colorClass={coverColor(b.daysOfCover)}
              className="flex-1"
            />
            <span className="w-12 shrink-0 text-right text-[13px] tnum">
              {coverLabel(b.daysOfCover)}
            </span>
            <span className="w-14 shrink-0 text-right text-[13px] font-medium tnum">
              {b.grandTotal.toLocaleString("en-US")}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-auto border-t border-border pt-3 text-xs text-text-muted">
        Total to produce (14 d window):{" "}
        <span className="font-medium text-text-primary tnum">
          {data.totalToProduce.toLocaleString("en-US")}
        </span>
      </p>
      </div>
    </DashCard>
  );
}
