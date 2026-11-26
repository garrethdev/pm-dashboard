"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Sparkles, Users } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { DashCard } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { StatusPill } from "@/components/ui/pill";
import { Tooltip } from "@/components/ui/tooltip";
import {
  INVENTORY_RANGES,
  type InventoryRangeKey,
  type ProductionOrderRow,
} from "@/lib/data/inventory";
import { newTypeDetail, toProduce } from "@/lib/data/production-order-rules";
import { cn } from "@/lib/utils";

/** v_scheduler_production_order.status carries its own vocabulary — map it
 *  onto our pill tones rather than re-deriving urgency from days_cover. */
const ORDER_TONE: Record<string, "gray" | "danger" | "warn" | "ok" | "neutral"> = {
  EMPTY: "gray",
  CRITICAL: "danger",
  low: "warn",
  ok: "ok",
};

/**
 * Simplified on 2026-11-26 (Garreth): only content type, status, ready, to do
 * and Generate remain. Days of cover, quarantined and demand per week went as
 * detail nobody acted on, and the character column went because only
 * Character 6 posts.
 *
 * Two dropdowns at the top right, both working in the browser on rows already
 * loaded: Character (ready for when another character comes back) and Buffer.
 * "To do" is what to make to hold the chosen buffer: 7 days, 14 days (the
 * default) or 1 month. It is the column to act on, so it stands out: a light
 * band, a bolder header and larger numbers, red when there is something to
 * make. The band is rounded at both ends with the same space above the header
 * as below the last number, so every header carries that top padding to stay
 * on one line.
 */

/** "Character 6" shown as "Char 6", as everywhere else on the page. */
const short = (c: string) => c.replace("Character ", "Char ");

/** The scheduler's own ranking, worst cover first. */
export function ProductionOrderCard({
  rows,
  fetchedAt,
}: {
  rows: ProductionOrderRow[];
  fetchedAt?: string;
}) {
  const [char, setChar] = useState("all");
  const [buffer, setBuffer] = useState<InventoryRangeKey>("14d");
  const characters = useMemo(() => [...new Set(rows.map((r) => r.character))].sort(), [rows]);
  const shown = char === "all" ? rows : rows.filter((r) => r.character === char);
  const bufferEntry = INVENTORY_RANGES.find((r) => r.key === buffer) ?? INVENTORY_RANGES[1];

  return (
    <DashCard
      title="What to make next"
      fetchedAt={fetchedAt}
      actions={
        <>
          <OptionMenu
            icon={<Users className="size-3.5" />}
            value={char}
            onChange={setChar}
            options={[
              { value: "all", label: "All characters" },
              ...characters.map((c) => ({ value: c, label: short(c) })),
            ]}
          />
          <OptionMenu
            icon={<CalendarRange className="size-3.5" />}
            value={buffer}
            onChange={(v) => setBuffer(v as InventoryRangeKey)}
            prefix="Buffer: "
            options={INVENTORY_RANGES.map((r) => ({ value: r.key, label: r.label }))}
          />
        </>
      }
    >
      <div className="overflow-x-auto">
        <table
          hidden={shown.length === 0}
          className="w-full text-left text-sm [&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0"
        >
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pt-2.5 pb-2 font-medium whitespace-nowrap">Content type</th>
              <th className="pt-2.5 pb-2 font-medium whitespace-nowrap">Status</th>
              <th className="w-px pt-2.5 pb-2 font-medium whitespace-nowrap">Ready</th>
              <th className="w-px rounded-t-lg bg-card-raised pt-2.5 pb-2 font-semibold whitespace-nowrap text-text-primary">
                To do
              </th>
              <th className="w-px pt-2.5 pb-2 font-medium whitespace-nowrap">Generate</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o, i) => {
              const todo = toProduce(o, bufferEntry.days);
              return (
                <tr key={`${o.character}-${o.contentType}`} className="border-t border-border">
                  <td className="py-2.5 font-mono text-xs text-text-muted whitespace-nowrap">
                    {o.contentType}
                    {/* In its priority week the scheduler gives it to every
                        account first, so its demand jumps; this says why. */}
                    {o.isNew && (
                      <Tooltip label={newTypeDetail(o.priorityUntil)} side="right" className="ml-2 font-sans">
                        <StatusPill tone="info" className="cursor-default font-sans">
                          New
                        </StatusPill>
                      </Tooltip>
                    )}
                  </td>
                  <td className="py-2.5">
                    <StatusPill tone={ORDER_TONE[o.status] ?? "neutral"}>
                      {o.status.toLowerCase()}
                    </StatusPill>
                  </td>
                  <td className="py-2.5 tnum">{o.usablePool}</td>
                  {/* Red only when there is actually something to make; a red
                      "0" would read as an alarm for a healthy lane. */}
                  <td
                    className={cn(
                      "bg-card-raised py-2.5 text-base font-semibold tnum",
                      // The band's bottom matches its rounded top.
                      i === shown.length - 1 && "rounded-b-lg",
                      todo > 0 ? "text-pill-red" : "text-text-muted",
                    )}
                  >
                    {todo}
                  </td>
                  <td className="py-2.5">
                    <GenerateButton contentType={o.contentType} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && (
        <EmptyState icon={Sparkles}>
          {rows.length === 0 ? "Nothing to make yet" : "Nothing to make for this character"}
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
      <span className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-border bg-card-raised px-2.5 py-1 text-xs font-medium whitespace-nowrap text-text-muted select-none">
        <Sparkles className="size-3 shrink-0" />
        Generate
        {/* The tooltip is presentational; assistive tech gets the same fact. */}
        <span className="sr-only">{contentType} coming soon</span>
      </span>
    </Tooltip>
  );
}

/** A small pick-one menu: the button shows the current choice. */
function OptionMenu({
  icon,
  value,
  onChange,
  options,
  prefix = "",
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  prefix?: string;
}) {
  const current = options.find((o) => o.value === value)?.label ?? value;
  return (
    <Dropdown align="right" label={`${prefix}${current}`} icon={icon}>
      {(close) => (
        <div className="flex flex-col p-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                close();
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-left text-xs font-medium whitespace-nowrap transition-colors hover:bg-card-raised",
                o.value === value ? "text-accent" : "text-text-muted",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </Dropdown>
  );
}
