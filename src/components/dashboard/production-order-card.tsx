"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Sparkles } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { DashCard } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { FilterPills } from "@/components/ui/filter-pills";
import { StatusPill } from "@/components/ui/pill";
import { Tooltip } from "@/components/ui/tooltip";
import { BarcodeBar } from "@/components/ui/barcode-bar";
import { coverColor } from "@/components/dashboard/inventory-card-live";
import {
  INVENTORY_RANGES,
  type InventoryRangeKey,
  type ProductionOrderRow,
} from "@/lib/data/inventory";
import { cn } from "@/lib/utils";

/** v_scheduler_production_order.status carries its own vocabulary — map it
 *  onto our pill tones rather than re-deriving urgency from days_cover. */
/**
 * The "To Produce" buffer horizon reuses INVENTORY_RANGES so this card offers
 * the same 7 days / 14 days / 1 month choices as Demand vs supply above.
 *
 * The view ships only produce_to_reach_21d, but that is just
 * `ceil(weekly_demand * 21/7 - usable_pool)`, so any horizon is derivable in the
 * browser from weeklyDemand + usablePool with no refetch. Verified against
 * v_scheduler_production_order at 21 d: 0 mismatches over all 17 rows.
 *
 * Only this column is horizon-dependent. `usable_pool` and `quarantined` are
 * current stocks, `weekly_demand` is a rate, and `days_cover` / `status` are
 * already expressed in days of cover — none shift with the selection.
 */
const ORDER_TONE: Record<string, "gray" | "danger" | "warn" | "ok" | "neutral"> = {
  EMPTY: "gray",
  CRITICAL: "danger",
  low: "warn",
  ok: "ok",
};

/** The scheduler's own ranking, worst cover first. The character filter is
 *  client-side: every row is already in the payload, so switching costs nothing. */
export function ProductionOrderCard({
  rows,
  fetchedAt,
}: {
  rows: ProductionOrderRow[];
  fetchedAt?: string;
}) {
  const [char, setChar] = useState("all");
  const [horizon, setHorizon] = useState<InventoryRangeKey>("14d");
  const characters = useMemo(
    () => [...new Set(rows.map((r) => r.character))].sort(),
    [rows],
  );
  const shown = char === "all" ? rows : rows.filter((r) => r.character === char);

  const horizonEntry = INVENTORY_RANGES.find((r) => r.key === horizon) ?? INVENTORY_RANGES[1];

  /** Mirrors the view's own arithmetic, generalised off its fixed 21 days. */
  const toProduce = (r: ProductionOrderRow) =>
    Math.max(0, Math.ceil(r.weeklyDemand * (horizonEntry.days / 7) - r.usablePool));

  return (
    <DashCard
      title="What to make next"
      fetchedAt={fetchedAt}
      toolbar={
        <FilterPills
          value={char}
          onChange={setChar}
          options={[
            { value: "all", label: "All" },
            ...characters.map((c) => ({ value: c, label: c.replace("Character ", "Char ") })),
          ]}
        />
      }
      actions={
        <Dropdown
          align="right"
          label={`Buffer: ${horizonEntry.label}`}
          icon={<CalendarRange className="size-3.5" />}
        >
          {(close) => (
            <div className="flex flex-col p-1">
              {INVENTORY_RANGES.map((h) => (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => {
                    setHorizon(h.key);
                    close();
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-card-raised",
                    h.key === horizon ? "text-accent" : "text-text-muted",
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}
        </Dropdown>
      }
    >
      <div className="overflow-x-auto">
        {/* Left-aligned throughout, and spacing lives on the table rather
            than on individual cells. The three count columns are pinned narrow
            so the leftover width falls to Content type and Days of cover, which
            are the ones that can actually use it — otherwise auto-layout
            spreads it evenly and every number drifts away from its header. */}
        <table hidden={shown.length === 0} className="w-full text-left text-sm [&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-2 font-medium whitespace-nowrap">Character</th>
              <th className="pb-2 font-medium whitespace-nowrap">Content type</th>
              <th className="pb-2 font-medium whitespace-nowrap">Status</th>
              <th className="pb-2 font-medium whitespace-nowrap">Days of cover</th>
              <th className="w-px pb-2 font-medium whitespace-nowrap">Usable</th>
              <th className="w-px pb-2 font-medium whitespace-nowrap">Quarantined</th>
              <th className="w-px pb-2 font-medium whitespace-nowrap">Demand/wk</th>
              <th className="w-px pb-2 font-medium whitespace-nowrap">To produce</th>
              <th className="w-px pb-2 font-medium whitespace-nowrap">Generate</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr
                key={`${o.character}-${o.contentType}`}
                className="border-t border-border"
              >
                <td className="py-2.5 font-medium whitespace-nowrap">
                  {o.character.replace("Character ", "Char ")}
                </td>
                <td className="py-2.5 font-mono text-xs text-text-muted whitespace-nowrap">
                  {o.contentType}
                </td>
                <td className="py-2.5">
                  <StatusPill tone={ORDER_TONE[o.status] ?? "neutral"}>
                    {o.status.toLowerCase()}
                  </StatusPill>
                </td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <BarcodeBar
                      pct={(Math.min(o.daysCover, 21) / 21) * 100}
                      colorClass={coverColor(o.daysCover)}
                      className="h-3 w-24"
                    />
                    {/* Whole days, matching coverLabel() in the table above. Not
                        coverLabel() itself: its ">=14 -> 2+ w" cap would flatten
                        20 d and 33 d to one label, and ranking those apart is the
                        point of this table. */}
                    <span className="text-xs tnum">{`${Math.round(o.daysCover)} d`}</span>
                  </div>
                </td>
                <td className="py-2.5 tnum">{o.usablePool}</td>
                <td
                  className={cn(
                    "py-2.5 tnum",
                    o.quarantined > 0 ? "text-warn" : "text-text-muted",
                  )}
                >
                  {o.quarantined}
                </td>
                <td className="py-2.5 tnum text-text-muted">{o.weeklyDemand}</td>
                {/* The make-up quantity to reach a 21-day buffer — i.e. the
                    deficit. Red only when there is actually something to make;
                    a red "0" would read as an alarm for a healthy lane. */}
                <td className="py-2.5">
                  <StatusPill tone={toProduce(o) > 0 ? "danger" : "gray"}>
                    {toProduce(o)}
                  </StatusPill>
                </td>
                <td className="py-2.5">
                  <GenerateButton contentType={o.contentType} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && (
        <EmptyState icon={Sparkles}>
          {rows.length === 0 ? "Nothing to make yet" : "Nothing queued for this character"}
        </EmptyState>
      )}
    </DashCard>
  );
}

/**
 * The way into producing a lane, from the row that says how much of it is
 * needed. The generator itself is v2 — the sidebar carries the same promise —
 * so this is a placeholder, not a control: a span rather than a button, so it
 * is not focusable and cannot be clicked into a page that does not exist.
 *
 * The tooltip sits to the left because this table scrolls horizontally, which
 * makes it clip anything placed above a row.
 */
function GenerateButton({ contentType }: { contentType: string }) {
  return (
    <Tooltip label="Coming soon" side="left">
      <span
        className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-border bg-card-raised px-2.5 py-1 text-xs font-medium whitespace-nowrap text-text-muted select-none"
      >
        <Sparkles className="size-3 shrink-0" />
        Generate
        {/* The tooltip is presentational; assistive tech gets the same fact. */}
        <span className="sr-only">{contentType} coming soon</span>
      </span>
    </Tooltip>
  );
}
