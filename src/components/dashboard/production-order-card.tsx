"use client";

import { useMemo, useState } from "react";
import { Sparkles, Users } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { DashCard } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { StatusPill } from "@/components/ui/pill";
import { Tooltip } from "@/components/ui/tooltip";
import type { ProductionOrderRow } from "@/lib/data/inventory";
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
 * "To do" is what to make to hold a 14-day buffer, the old Buffer menu's
 * default. Simplified on 2026-11-26 (Garreth): only content type, status,
 * ready, to do and Generate remain. The character column and filter went
 * because only Character 6 posts; days of cover, quarantined, demand per week
 * and the buffer menu went as detail nobody acted on. "To do" is the column
 * to act on, so it is the one that stands out: a light band, a bolder header
 * and larger numbers, red when there is something to make. The band is rounded
 * at both ends with the same space above the header as below the last number,
 * so every header carries that top padding to stay on one line.
 */
const BUFFER_DAYS = 14;

/** "Character 6" shown as "Char 6", as everywhere else on the page. */
const short = (c: string) => c.replace("Character ", "Char ");

/** The scheduler's own ranking, worst cover first. The character filter is a
 *  dropdown (Garreth 2026-11-26): only Character 6 posts today, but it is
 *  ready for when another character comes back. It filters in the browser;
 *  every row is already loaded. */
export function ProductionOrderCard({
  rows,
  fetchedAt,
}: {
  rows: ProductionOrderRow[];
  fetchedAt?: string;
}) {
  const [char, setChar] = useState("all");
  const characters = useMemo(() => [...new Set(rows.map((r) => r.character))].sort(), [rows]);
  const shown = char === "all" ? rows : rows.filter((r) => r.character === char);

  return (
    <DashCard
      title="What to make next"
      fetchedAt={fetchedAt}
      actions={
        <Dropdown
          align="right"
          label={char === "all" ? "All characters" : short(char)}
          icon={<Users className="size-3.5" />}
        >
          {(close) => (
            <div className="flex flex-col p-1">
              {["all", ...characters].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setChar(c);
                    close();
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-left text-xs font-medium whitespace-nowrap transition-colors hover:bg-card-raised",
                    c === char ? "text-accent" : "text-text-muted",
                  )}
                >
                  {c === "all" ? "All characters" : short(c)}
                </button>
              ))}
            </div>
          )}
        </Dropdown>
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
              const todo = toProduce(o, BUFFER_DAYS);
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
