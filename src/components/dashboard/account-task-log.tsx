"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, SlidersHorizontal } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { FilterChips } from "@/components/ui/filter-chips";
import { FilterPills } from "@/components/ui/filter-pills";
import { StatusPill } from "@/components/ui/pill";
import { formatEtDate } from "@/lib/data/format";
import type { AccountTask } from "@/lib/data/account-detail";
import { cn } from "@/lib/utils";

type Tab = "executed" | "pending";

function statusTone(status: number | null) {
  if (status === 3) return "ok" as const;
  if (status === 4) return "danger" as const;
  if (status === 1 || status === 2) return "info" as const;
  return "neutral" as const;
}

function relDay(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) {
    const d = Math.ceil(-ms / 86_400_000);
    return d <= 1 ? "soon" : `in ${d}d`;
  }
  const d = Math.floor(ms / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  return `${d}d ago`;
}

function detailOf(t: AccountTask): string {
  if (t.failDesc) return `${t.failDesc}${t.failCode ? ` (${t.failCode})` : ""}`;
  if (t.actions && Object.keys(t.actions).length > 0) {
    return Object.entries(t.actions)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return t.sourceWorkflow ?? "—";
}

export function AccountTaskLog({
  executed,
  pending,
}: {
  executed: AccountTask[];
  pending: AccountTask[];
}) {
  const [tab, setTab] = useState<Tab>("executed");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [newestFirst, setNewestFirst] = useState(true);

  const source = tab === "executed" ? executed : pending;

  // Options come from what this account actually has, so you never pick a
  // filter that returns nothing.
  const kinds = useMemo(
    () => [...new Set(source.map((t) => t.kind))].sort(),
    [source],
  );
  const statuses = useMemo(
    () => [...new Set(source.map((t) => t.statusLabel))].sort(),
    [source],
  );

  const rows = useMemo(() => {
    const out = source.filter(
      (t) => (kind === "all" || t.kind === kind) && (status === "all" || t.statusLabel === status),
    );
    out.sort((a, b) =>
      newestFirst ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at),
    );
    return out;
  }, [source, kind, status, newestFirst]);

  const activeFilters = (kind !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);

  // Task and status values come from the data, so they are shown as-is rather
  // than mapped through a label table that would silently drop a new one.
  const chips = [
    ...(kind !== "all" ? [{ key: "kind", label: kind, onClear: () => setKind("all") }] : []),
    ...(status !== "all"
      ? [{ key: "status", label: status, onClear: () => setStatus("all") }]
      : []),
  ];
  const SortIcon = newestFirst ? ArrowDown : ArrowUp;

  return (
    <Card className="flex flex-col gap-6">
      {/* Title + tab pills together on the left, Filters on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
        <h2 className="shrink-0 text-base font-semibold">Geelark automation log</h2>
        <FilterPills
          options={[
            { value: "executed", label: `Executed (${executed.length})` },
            { value: "pending", label: `Pending (${pending.length})` },
          ]}
          value={tab}
          onChange={(v) => {
            setTab(v as Tab);
            // Options differ per tab; a stale pick would show an empty table.
            setKind("all");
            setStatus("all");
          }}
        />
        </div>

        <Dropdown
          label="Filters"
          icon={<SlidersHorizontal className="size-3.5" />}
          badge={activeFilters || undefined}
          align="right"
        >
          {() => (
          <div className="flex flex-col gap-3 p-1">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">Task</span>
              <div className="flex flex-wrap gap-1.5">
                {["all", ...kinds].map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      kind === k
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border text-text-muted hover:text-text-primary",
                    )}
                  >
                    {k === "all" ? "All" : k}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">Status</span>
              <div className="flex flex-wrap gap-1.5">
                {["all", ...statuses].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      status === s
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border text-text-muted hover:text-text-primary",
                    )}
                  >
                    {s === "all" ? "All" : s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}
        </Dropdown>
        <FilterChips
          chips={chips}
          onClearAll={() => {
            setKind("all");
            setStatus("all");
          }}
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">
          {source.length === 0
            ? tab === "pending"
              ? "Nothing queued for this profile."
              : "No Geelark tasks recorded for this profile."
            : "No tasks match these filters."}
        </p>
      ) : (
        // Scrolls rather than pushing the page sideways. Four columns plus the
        // 32px gutters do not fit a phone, and with no floor the table
        // compressed until it dragged the whole page out from under the header.
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm [&_td]:pr-8 [&_th]:pr-8 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="pb-2 font-medium whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setNewestFirst((v) => !v)}
                    title={newestFirst ? "Newest first" : "Oldest first"}
                    className="inline-flex items-center gap-1 text-accent transition-colors hover:opacity-80"
                  >
                    When <SortIcon className="size-3" />
                  </button>
                </th>
                <th className="pb-2 font-medium whitespace-nowrap">Task</th>
                <th className="pb-2 font-medium whitespace-nowrap">Status</th>
                <th className="w-full pb-2 font-medium whitespace-nowrap">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.taskId} className="border-t border-border">
                  <td className="py-2.5 whitespace-nowrap">
                    <span className="tnum">{formatEtDate(t.at)}</span>
                    <span className="ml-2 text-xs text-text-muted">{relDay(t.at)}</span>
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span className="rounded-full border border-border bg-card-raised px-2 py-0.5 text-xs">
                      {t.kind}
                    </span>
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <StatusPill tone={statusTone(t.status)}>{t.statusLabel}</StatusPill>
                  </td>
                  {/* Only this column scrolls. max-w-0 + w-full pins the cell to
                      the leftover width so a long action list overflows inside
                      the row instead of widening the whole page. */}
                  <td
                    className={cn(
                      "w-full max-w-0 py-2.5 text-xs",
                      t.failCode ? "text-danger" : "text-text-muted",
                    )}
                  >
                    <div className="overflow-x-auto whitespace-nowrap">{detailOf(t)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
