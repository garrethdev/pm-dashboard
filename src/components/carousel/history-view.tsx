"use client";

/**
 * History (D9, approved 2026-09-15; D12's Auto pill and waiting words). A
 * table of every batch: date, type, requested, written, rendered, approved,
 * status, and the way in. Filters by type (chips) and date range. The
 * first-run empty state offers Generate; a filtered-empty offers Clear.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Accent, Btn, LoadError, Pill, WordsPill, shortDate, useJson } from "@/components/carousel/kit";
import { EmptyState } from "@/components/ui/empty-state";
import { Dropdown } from "@/components/ui/dropdown";
import { Check, History, RotateCw } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { BatchSummary } from "@/server/carousel/repo/types";
import { batchWords } from "@/server/carousel/status-words";

const RANGES = [
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;

function num(n: number, blankWhenZero = false): string {
  return blankWhenZero && n === 0 ? "—" : String(n);
}

export function HistoryView({ initial, types }: { initial: BatchSummary[] | null; types: { id: string; name: string }[] }) {
  const { data, error, reload } = useJson<{ batches: BatchSummary[] }>("/api/carousel-generator/history", { every: 10_000, initial: initial ? { batches: initial } : null });
  const [type, setType] = useState<string | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("30");
  const all = data?.batches ?? initial;

  // The clock is read once per mount: a filter that moved while the page sat
  // open would reorder rows under the reader for no reason.
  const [now] = useState(() => Date.now());
  const rows = useMemo(() => {
    if (!all) return [];
    const days = RANGES.find((r) => r.key === range)?.days ?? null;
    const since = days ? now - days * 86_400_000 : 0;
    return all.filter((b) => (!type || b.typeId === type) && Date.parse(b.createdAt) >= since);
  }, [all, type, range, now]);

  if (!all) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold">History</h1>
        <LoadError message={error ?? "History could not be loaded"} onRetry={reload} />
      </div>
    );
  }
  const filtered = Boolean(type) || range !== "all";
  const typeChips = types.filter((t) => all.some((b) => b.typeId === t.id));

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">History</h1>
        {all.length > 0 && <span className="text-sm text-text-muted tnum">{rows.length} {rows.length === 1 ? "batch" : "batches"}</span>}
      </div>
      {all.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Filter by carousel type" className="no-scrollbar flex gap-1.5 overflow-x-auto">
            <button type="button" aria-pressed={type === null} onClick={() => setType(null)} className={cn("rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap", type === null ? "border-accent text-accent" : "border-border text-text-muted hover:text-text-primary")}>All types</button>
            {typeChips.map((t) => (
              <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => setType(type === t.id ? null : t.id)} className={cn("rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap", type === t.id ? "border-accent text-accent" : "border-border text-text-muted hover:text-text-primary")}>{t.name}</button>
            ))}
          </div>
          <div className="ml-auto">
            <Dropdown label={RANGES.find((r) => r.key === range)?.label ?? ""} align="right">
              {(close) => (
                <div role="listbox" aria-label="Date range" className="flex flex-col">
                  {RANGES.map((r) => (
                    <button key={r.key} type="button" role="option" aria-selected={range === r.key} onClick={() => { setRange(r.key); close(); }} className="flex items-center justify-between gap-6 rounded-[10px] px-2 py-1.5 text-left text-sm hover:bg-card">
                      {r.label}
                      {range === r.key && <Check className="size-3.5 text-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>
          </div>
        </div>
      )}
      {all.length === 0 ? (
        <div className="flex flex-1 flex-col rounded-card border border-border bg-card p-5">
          <EmptyState icon={History}>No batches yet</EmptyState>
          <div className="flex justify-center pb-4"><Accent href="/carousel-generator/types">Generate</Accent></div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-1 flex-col rounded-card border border-border bg-card p-5">
          <EmptyState icon={History}>No batches match</EmptyState>
          {filtered && <div className="flex justify-center pb-4"><Btn onClick={() => { setType(null); setRange("all"); }}>Clear filters</Btn></div>}
        </div>
      ) : (
        <section className="overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="hidden grid-cols-[88px_minmax(0,1fr)_80px_80px_80px_80px_150px_120px] gap-3 border-b border-border px-5 py-2.5 text-xs text-text-muted md:grid">
            <span>Date</span><span>Carousel type</span><span>Requested</span><span>Written</span><span>Rendered</span><span>Approved</span><span>Status</span><span />
          </div>
          {rows.map((b) => {
            const w = batchWords(b);
            const openLabel = w.stage === "to_render" ? "Render" : w.stage === "to_approve" ? "Approve" : w.stage === "stopped" ? "Continue" : "Open batch";
            return (
              <div key={b.id} className="relative grid grid-cols-1 gap-2 border-b border-border px-5 py-3 last:border-b-0 hover:bg-card-raised md:grid-cols-[88px_minmax(0,1fr)_80px_80px_80px_80px_150px_120px] md:items-center md:gap-3">
                <Link href={w.href as never} aria-label={`Open ${b.batchName}`} className="absolute inset-0 z-0" />
                <div className="flex items-center justify-between md:contents">
                  <span className="text-sm tnum">{shortDate(b.createdAt)}</span>
                  <span className="md:hidden"><WordsPill words={w} /></span>
                </div>
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium" title={b.batchName}>{b.typeName}</span>
                  <span className="text-xs text-text-muted">{b.batchName}</span>
                  {b.rerunOf && <span className="inline-flex items-center gap-1 text-xs text-text-muted"><RotateCw className="size-3" />Rerun</span>}
                  {b.madeInAuto && <span className="md:hidden"><Pill>Auto</Pill></span>}
                </span>
                <div className="grid grid-cols-4 gap-2 md:contents">
                  {[["Requested", num(b.requested)], ["Written", num(b.counts.written, b.counts.written === 0 && w.stage === "writing")], ["Rendered", num(b.counts.rendered, b.counts.rendered === 0)], ["Approved", num(b.counts.approved, b.counts.approved === 0)]].map(([l, v]) => (
                    <span key={l} className="flex flex-col md:contents">
                      <span className="text-[11px] text-text-muted md:hidden">{l}</span>
                      <span className={cn("text-sm tnum", v === "—" && "text-text-muted")}>{v}</span>
                    </span>
                  ))}
                </div>
                <span className="hidden items-center gap-1.5 md:flex"><WordsPill words={w} />{b.madeInAuto && <Pill>Auto</Pill>}</span>
                <span className="relative z-10 flex md:justify-end"><Btn href={w.href}>{openLabel}</Btn></span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
