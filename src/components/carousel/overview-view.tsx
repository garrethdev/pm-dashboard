"use client";

/**
 * Overview (D16, approved 2026-09-22). Four sections: Today's four numbers,
 * Running Tasks beside Carousel types, then Trending Carousels beside Saved.
 * A task card's ring turns while the batch works and stands still when it
 * waits for a person; the icon names the stage. The stat tiles are the
 * dashboard's own MetricTile, value for value.
 */
import Link from "next/link";
import { useState } from "react";
import { Accent, Btn, LoadError, Pill, SectionHead, ago, compact, shortDate, useJson } from "@/components/carousel/kit";
import { DetailsWindow } from "@/components/carousel/details-window";
import { ChevronRight, Flag, Images, LayoutList, Pause, Pencil, Play, SealCheck } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { BatchSummary, OverviewData, Reference } from "@/server/carousel/repo/types";
import { batchWords, type BatchStage } from "@/server/carousel/status-words";

const STAGE_ICON: Record<BatchStage, React.ComponentType<{ className?: string }>> = {
  writing: Pencil,
  rendering: Images,
  to_approve: SealCheck,
  to_render: Play,
  flagged: Flag,
  stopped: Pause,
  done: SealCheck,
};

const CHEVRON = Array.from({ length: 9 }, (_, i) => (Math.floor(i / 3) === 1 ? 0 : 90) + (i % 3) * 90);

/** The pixel grid a working batch carries in place of the still ring. */
function Loader({ render }: { render: boolean }) {
  return (
    <span aria-hidden className="grid size-11 shrink-0 grid-cols-3 content-center justify-center gap-0.5">
      {CHEVRON.map((d, i) => (
        <span
          key={i}
          className={cn("size-1.5 rounded-[1px] animate-[px16on_650ms_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-60", render ? "bg-accent" : "bg-text-primary")}
          style={{ animationDelay: `${d}ms`, opacity: 0.12 }}
        />
      ))}
      <style>{`@keyframes px16on{0%,100%{opacity:.12}50%{opacity:1}}`}</style>
    </span>
  );
}

function Ring({ stage, bad }: { stage: BatchStage; bad: boolean }) {
  const Icon = STAGE_ICON[stage];
  return (
    <span className="relative flex size-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden className="absolute inset-0">
        <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeWidth="3" className="text-text-primary/20" />
      </svg>
      <Icon className={cn("size-[18px]", bad ? "text-danger" : "text-text-primary")} />
    </span>
  );
}

function TaskCard({ b }: { b: BatchSummary }) {
  const w = batchWords(b);
  const working = w.stage === "writing" || w.stage === "rendering";
  const bad = w.stage === "flagged" || w.stage === "stopped";
  const state = w.stage === "flagged" && w.aside ? w.aside.split(" · ")[0] : w.label;
  return (
    <Link
      href={w.href as never}
      className="relative grid grid-cols-[44px_minmax(0,1fr)_14px] items-center gap-x-3.5 gap-y-0.5 rounded-[20px] border border-border bg-card px-4 py-3.5 shadow-card transition-colors hover:border-text-muted/40 hover:bg-card-raised sm:grid-cols-[44px_minmax(0,1fr)_auto_14px] sm:px-[18px] sm:py-3"
    >
      {working ? <Loader render={w.stage === "rendering"} /> : <Ring stage={w.stage} bad={bad} />}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold leading-[22px] tracking-[-0.01em]" title={b.typeName}>
          {b.typeName}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[18px] text-text-muted">
          <span className={cn("tnum", working ? "animate-pulse text-text-primary" : w.stage === "stopped" ? "text-danger" : "text-text-primary")}>{state}</span>
        </span>
      </span>
      <span className="col-start-2 flex items-center gap-2.5 sm:col-start-3">
        {b.madeInAuto && b.lifecycle === "open" && <Pill>{b.mode === "auto" ? "Auto" : "Auto paused"}</Pill>}
        <span className="text-xs whitespace-nowrap text-text-muted tnum">{ago(b.lastMovementAt)}</span>
      </span>
      <ChevronRight className="col-start-3 row-span-2 row-start-1 size-3.5 text-text-muted sm:col-start-4 sm:row-span-1" />
    </Link>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="dot-fade flex flex-col justify-between gap-2.5 overflow-hidden rounded-nested border border-border bg-card-raised px-5 py-4 text-text-muted">
      <span className="relative z-10 text-xs">{label}</span>
      <span className="relative z-10 text-[40px] leading-none font-semibold tracking-[-0.02em] text-text-primary tnum">{value}</span>
    </div>
  );
}

function Cover({ r, onOpen, big }: { r: Reference; onOpen: () => void; big?: boolean }) {
  const img = r.slides[0]?.media ?? r.thumbnail;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${r.handle ?? "Carousel"}, ${r.slides.length} slides`}
      className={cn("relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-border bg-card-sunken bg-cover bg-center transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]", big && "rounded-xl")}
      style={img ? { backgroundImage: `url("${img}")` } : undefined}
    >
      <span className="absolute top-2 right-2 text-white drop-shadow"><LayoutList className="size-3.5" /></span>
      <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 text-[11px] font-medium leading-4 text-white tnum">{r.slides.length} slides</span>
    </button>
  );
}

const EmptyMark = () => (
  <svg width="62" height="50" viewBox="0 0 62 50" fill="none" aria-hidden className="text-text-muted opacity-55">
    <rect x="0.75" y="11" width="9" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" opacity=".4" />
    <rect x="52.25" y="11" width="9" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" opacity=".4" />
    <rect x="16.75" y="1.75" width="28.5" height="46.5" rx="5" fill="var(--card-sunken)" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export function OverviewView({ initial }: { initial: OverviewData | null }) {
  const { data, error, reload } = useJson<OverviewData>("/api/carousel-generator/overview", { every: 15_000, initial });
  const [open, setOpen] = useState<number | null>(null);
  const d = data ?? initial;

  if (!d) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold">Overview</h1>
        <LoadError message={error ?? "Overview could not be loaded"} onRetry={reload} />
      </div>
    );
  }

  if (d.firstRun) {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <h1 className="text-xl font-semibold">Overview</h1>
        <div data-empty-fill="" className="flex min-h-[360px] flex-1 flex-col items-center justify-center gap-4 rounded-card border border-border bg-card-sunken px-7 py-11 text-center">
          <EmptyMark />
          <h4 className="text-base font-semibold">Nothing generated yet</h4>
          <Accent href="/carousel-generator/types">Carousel types</Accent>
        </div>
      </div>
    );
  }

  const trendNote = d.trending.asOf ? (d.trending.isToday ? "Scraped today" : `Newest scrape · ${shortDate(d.trending.asOf)}`) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Overview</h1>
      </div>
      {error && <LoadError message={error} onRetry={reload} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Written today" value={d.today.written} />
        <Tile label="Rendered today" value={d.today.rendered} />
        <Tile label="Approved today" value={d.today.approved} />
        <Tile label="Needs input" value={d.today.needsInput} />
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-w-0 flex-col gap-2.5" aria-labelledby="o-tasks">
          <SectionHead title="Running Tasks" note={d.tasks.length ? String(d.tasks.length) : undefined} />
          {d.tasks.length ? (
            <div className="flex flex-1 flex-col gap-2.5">
              {d.tasks.map((b) => (
                <TaskCard key={b.id} b={b} />
              ))}
            </div>
          ) : (
            <p className="flex min-h-[116px] flex-1 items-center justify-center rounded-[20px] border border-dashed border-border bg-card-sunken p-4 text-[13px] text-text-muted">Nothing running</p>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-2.5" aria-labelledby="o-types">
          <SectionHead title="Carousel types" link={{ href: "/carousel-generator/types", label: `All ${d.totalTypes} types` }} />
          {d.types.length ? (
            <div className="flex flex-1 flex-col rounded-[20px] border border-border bg-card shadow-card">
              {d.types.map((t) => {
                const running = t.runningBatch;
                return (
                  <div key={t.id} className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] content-center items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0 sm:px-[18px]">
                    <Link href={`/carousel-generator/types/${t.slug}` as never} className="col-span-2 truncate text-sm font-medium underline decoration-transparent underline-offset-4 transition-colors hover:decoration-text-muted" title={t.name}>
                      {t.name}
                    </Link>
                    <Pill>{t.character}</Pill>
                    <span className="flex justify-end">
                      {running ? (
                        <Btn href={`/carousel-generator/batches/${running.id}`}>Open running batch</Btn>
                      ) : (
                        <Accent small href={`/carousel-generator/generate?type=${encodeURIComponent(t.id)}`}>Generate</Accent>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="flex min-h-[116px] flex-1 items-center justify-center rounded-[20px] border border-dashed border-border bg-card-sunken p-4 text-[13px] text-text-muted">No type generated yet</p>
          )}
        </section>
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-w-0 flex-col gap-2.5">
          <SectionHead title="Trending Carousels" note={trendNote} link={{ href: "/carousel-generator/trends", label: "All trends" }} />
          {d.trending.items.length ? (
            <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
              {d.trending.items.map((r) => (
                <div key={r.id} className="flex min-w-0 flex-col gap-2">
                  <Cover r={r} onOpen={() => setOpen(r.id)} big />
                  <div className="flex flex-col px-0.5">
                    <b className="truncate text-[13px] font-semibold">{r.handle ? `@${r.handle}` : "Unknown"}</b>
                    <span className="text-xs text-text-muted tnum">{compact(r.views) ? `${compact(r.views)} views` : "Views unknown"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="flex min-h-[116px] flex-1 items-center justify-center rounded-[20px] border border-dashed border-border bg-card-sunken p-4 text-[13px] text-text-muted">Nothing scraped yet</p>
          )}
        </section>
        <section className="flex min-w-0 flex-col gap-2.5">
          <SectionHead title="Saved" link={{ href: "/carousel-generator/trends?section=saved", label: "All saved" }} />
          {d.saved.length ? (
            <div className="grid grid-cols-3 gap-1.5">
              {d.saved.slice(0, 6).map((r) => (
                <Cover key={r.id} r={r} onOpen={() => setOpen(r.id)} />
              ))}
            </div>
          ) : (
            <p className="flex min-h-[116px] flex-1 items-center justify-center rounded-[20px] border border-dashed border-border bg-card-sunken p-4 text-[13px] text-text-muted">Nothing saved yet</p>
          )}
        </section>
      </div>

      {open !== null && <DetailsWindow id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}
