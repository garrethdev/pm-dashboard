import { BarcodeBar } from "@/components/ui/barcode-bar";
import { DashCard } from "@/components/ui/card";
import { getInventory } from "@/lib/data/inventory";
import { formatEtShort } from "@/lib/data/format";

export function coverColor(days: number): string {
  if (days < 3) return "bg-danger";
  if (days < 7) return "bg-warn";
  return "bg-ok";
}

export function coverLabel(days: number): string {
  if (days >= 14) return "2+ w";
  return `${Math.round(days)} d`;
}

/** Homepage inventory card — days-of-cover per character × bucket, live. */
export async function InventoryCardLive({ className }: { className?: string }) {
  try {
    const { data, fetchedAt } = await getInventory();
    return (
      <DashCard
        title="Inventory"
        fetchedAt={formatEtShort(fetchedAt)}
        viewAllHref="/inventory"
        className={className}
      >
        <div className="flex flex-col gap-3">
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
        <p className="mt-4 border-t border-border pt-3 text-xs text-text-muted">
          Total to produce (14 d window):{" "}
          <span className="font-medium text-text-primary tnum">
            {data.totalToProduce.toLocaleString("en-US")}
          </span>
        </p>
      </DashCard>
    );
  } catch (err) {
    return (
      <DashCard title="Inventory" viewAllHref="/inventory" className={className}>
        <p className="text-sm text-text-muted">
          Supabase unreachable: {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
}
