"use client";

import { useCallback, useState } from "react";
import { UserPlus, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
            panelClassName="w-64"
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
                  <button
                    type="button"
                    onClick={() => apply(close)}
                    className="flex-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-bg"
                  >
                    Apply
                  </button>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-2 font-medium">Character</th>
              <th className="pb-2 font-medium">Bucket</th>
              <th className="pb-2 text-right font-medium">Target</th>
              <th className="pb-2 text-right font-medium">Scheduled</th>
              <th className="pb-2 text-right font-medium">Placeable now</th>
              <th className="pb-2 text-right font-medium">Shortfall</th>
              <th className="pb-2 text-right font-medium">Total to produce</th>
              <th className="pb-2 pl-6 font-medium">Days of cover</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((b) => (
              <tr
                key={`${b.character}-${b.bucket}`}
                className="border-t border-border hover:bg-card-raised/50"
              >
                <td className="py-2.5 font-medium whitespace-nowrap">
                  {b.character.replace("Character ", "Char ")}
                </td>
                <td className="py-2.5 text-text-muted">{b.bucket === "glp" ? "GLP" : "Filler"}</td>
                <td className="py-2.5 text-right tnum">{b.target}</td>
                <td className="py-2.5 text-right tnum">{b.scheduled}</td>
                <td className="py-2.5 text-right tnum">{b.pool}</td>
                <td className={cn("py-2.5 text-right tnum", b.shortfall > 0 && "text-danger")}>
                  {b.shortfall}
                </td>
                <td className="py-2.5 text-right font-medium tnum">
                  {b.grandTotal}
                  {b.newAcctAdd > 0 && (
                    <span className="ml-1 text-xs font-normal text-accent">+{b.newAcctAdd}</span>
                  )}
                </td>
                <td className="py-2.5 pl-6">
                  <div className="flex items-center gap-2">
                    <BarcodeBar
                      pct={(Math.min(b.daysOfCover, days) / days) * 100}
                      colorClass={coverColor(b.daysOfCover)}
                      className="h-3 w-24"
                    />
                    <span className="text-xs tnum">{coverLabel(b.daysOfCover)}</span>
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
