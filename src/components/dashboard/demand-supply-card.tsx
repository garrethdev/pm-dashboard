"use client";

import { useCallback, useState } from "react";
import { UserPlus, X } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { FilterPills } from "@/components/ui/filter-pills";
import { BarcodeBar } from "@/components/ui/barcode-bar";
import { formatLongDate } from "@/lib/data/format";
import { coverColor, coverLabel } from "@/components/dashboard/inventory-card-live";
import {
  INVENTORY_RANGES,
  type DemandSupplyData,
  type InventoryRangeKey,
} from "@/lib/data/inventory";
import { CtaButton } from "@/components/ui/cta-button";
import { cn } from "@/lib/utils";
import { useDataRefresh } from "@/lib/refresh-bus";

/** Demand vs supply. The window is a real recompute server-side, not a scaled
 *  14-day number: `scheduled` is an actual count per window and `pool` is a
 *  stock, so neither can be derived client-side. */
export function DemandSupplyCard({ initial }: { initial: DemandSupplyData }) {
  const [data, setData] = useState(initial);
  const [range, setRange] = useState<InventoryRangeKey>("14d");
  const [loading, setLoading] = useState(false);

  // Applied what-if. Null = off; the table shows plain demand.
  const [whatIf, setWhatIf] = useState<{ character: string; accounts: number } | null>(null);
  // Draft state inside the popover, only committed on Apply.
  const [draftChar, setDraftChar] = useState(initial.characters[0] ?? "");
  const [draftAccts, setDraftAccts] = useState(1);

  const load = useCallback(
    async (r: InventoryRangeKey, w: { character: string; accounts: number } | null) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ range: r });
        if (w) {
          qs.set("newAccounts", String(w.accounts));
          qs.set("character", w.character);
        }
        const res = await fetch(`/api/inventory?${qs}`);
        if (!res.ok) return;
        const json = (await res.json()) as { data: DemandSupplyData };
        setData(json.data);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Both halves of the current slice: the window and the applied what-if. A
  // refresh that dropped the what-if would silently change what the table is
  // answering.
  useDataRefresh(useCallback(() => load(range, whatIf), [load, range, whatIf]));

  const changeRange = (r: InventoryRangeKey) => {
    setRange(r);
    void load(r, whatIf);
  };

  const apply = (close: () => void) => {
    const next = draftAccts > 0 && draftChar ? { character: draftChar, accounts: draftAccts } : null;
    setWhatIf(next);
    void load(range, next);
    close();
  };

  const clearWhatIf = () => {
    setWhatIf(null);
    void load(range, null);
  };

  const reset = (close: () => void) => {
    clearWhatIf();
    close();
  };

  const days = INVENTORY_RANGES.find((r) => r.key === range)?.days ?? 14;

  return (
    <DashCard
      title="Demand vs supply"
      toolbar={
        <>
          <FilterPills
            value={range}
            onChange={(v) => changeRange(v as InventoryRangeKey)}
            options={INVENTORY_RANGES.map((r) => ({ value: r.key, label: r.label }))}
          />
          {data.window.start && (
            <span className="text-xs whitespace-nowrap text-text-muted">
              {formatLongDate(data.window.start)} - {formatLongDate(data.window.end)}
            </span>
          )}
        </>
      }
      actions={
        <>
          {loading && <span className="animate-pulse text-xs text-text-muted">updating…</span>}
          {whatIf && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-info">
              +{whatIf.accounts} {whatIf.character.replace("Character ", "Char ")}
              {whatIf.accounts === 1 ? " account" : " accounts"}
              <button
                type="button"
                onClick={clearWhatIf}
                aria-label="Clear simulated accounts"
                className="-mr-0.5 rounded-full p-0.5 transition-colors hover:bg-info/20"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          <Dropdown
            align="right"
            label="Simulate new accounts"
            icon={<UserPlus className="size-3.5" />}
            className={cn(whatIf && "border-info text-info")}
            panelClassName="sm:w-64"
          >
            {(close) => (
              <div className="flex flex-col gap-3 p-3">
                <p className="text-xs text-text-muted">
                  Simulate extra accounts starting today
                </p>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Character</span>
                  <select
                    value={draftChar}
                    onChange={(e) => setDraftChar(e.target.value)}
                    className="rounded-lg border border-border bg-card-raised px-2 py-1.5 text-sm"
                  >
                    {data.characters.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Accounts</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={draftAccts}
                    onChange={(e) => setDraftAccts(Math.max(0, Math.min(50, Number(e.target.value))))}
                    className="rounded-lg border border-border bg-card-raised px-2 py-1.5 text-sm tnum"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <CtaButton type="button" onClick={() => apply(close)} className="flex-1">
                    Apply
                  </CtaButton>
                  <button
                    type="button"
                    onClick={() => reset(close)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </Dropdown>
        </>
      }
    >
      <div className="overflow-x-auto">
        {/* Fixed layout, not auto. Auto sizes every column to its own content,
            so "Target" (six characters) sat tight while "Total to produce" got
            a column half again as wide, and the gaps ran 125px to 343px across
            one row. The seven data columns are now one width apart; the cover
            column takes the rest because it holds a bar, not a number. The
            min-width makes a narrow viewport scroll rather than crush the
            headers into each other. */}
        <table className="w-full min-w-[880px] table-fixed text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="w-[10%] pb-2 font-medium whitespace-nowrap">Character</th>
              <th className="w-[10%] pb-2 font-medium whitespace-nowrap">Bucket</th>
              <th className="w-[10%] pb-2 font-medium whitespace-nowrap">Target</th>
              <th className="w-[10%] pb-2 font-medium whitespace-nowrap">Scheduled</th>
              <th className="w-[10%] pb-2 font-medium whitespace-nowrap">Placeable now</th>
              <th className="w-[10%] pb-2 font-medium whitespace-nowrap">Shortfall</th>
              <th className="w-[10%] pb-2 font-medium whitespace-nowrap">Total to produce</th>
              <th className="w-[30%] pb-2 pl-6 font-medium whitespace-nowrap">Days of cover</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((b) => (
              <tr
                key={`${b.character}-${b.bucket}`}
                className="border-t border-border"
              >
                <td className="py-2.5 font-medium whitespace-nowrap">
                  {b.character.replace("Character ", "Char ")}
                </td>
                <td className="py-2.5 text-text-muted">{b.bucket === "glp" ? "GLP" : "Filler"}</td>
                <td className="py-2.5 tnum">{b.target}</td>
                <td className="py-2.5 tnum">{b.scheduled}</td>
                <td className="py-2.5 tnum">{b.pool}</td>
                <td className={cn("py-2.5 tnum", b.shortfall > 0 && "text-danger")}>
                  {b.shortfall}
                </td>
                <td className="py-2.5 font-medium tnum">
                  {b.grandTotal}
                  {b.newAcctAdd > 0 && (
                    <span className="ml-1 text-xs font-normal text-accent">+{b.newAcctAdd}</span>
                  )}
                </td>
                <td className="py-2.5 pl-6">
                  {/* The bar grows into whatever the last column was given.
                      Left at a fixed width it stopped well short of the card's
                      right edge, which read as the table failing to fill it. */}
                  <div className="flex items-center gap-2">
                    <BarcodeBar
                      pct={(Math.min(b.daysOfCover, days) / days) * 100}
                      colorClass={coverColor(b.daysOfCover)}
                      className="h-3 min-w-24 flex-1"
                    />
                    <span className="shrink-0 text-xs tnum">{coverLabel(b.daysOfCover)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashCard>
  );
}
