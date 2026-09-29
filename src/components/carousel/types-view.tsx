"use client";

/**
 * Carousel types (D1, with D12's waiting words and D13's Needs writing).
 * Every card: the name, the character and slides pills, View details (posts
 * left, days of cover, median views), then the footer with the last batch,
 * the waiting words when a batch waits for a press, and Generate — accent
 * when the type is the one most in need, or Open running batch.
 */
import Link from "next/link";
import { useState } from "react";
import { Accent, Btn, LoadError, Pill, shortDate, slidesText, useJson } from "@/components/carousel/kit";
import { ChevronDown, ChevronRight, Plus } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { CarouselType } from "@/server/carousel/repo/types";
import { batchWords } from "@/server/carousel/status-words";

function TypeCard({ t }: { t: CarouselType }) {
  const [open, setOpen] = useState(false);
  const retired = t.lifecycle === "retired";
  const running = t.runningBatch;
  const waiting = t.waitingBatch ? batchWords(t.waitingBatch) : null;
  const cover = t.daysOfCover;
  return (
    <article className={cn("flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-card", retired && "opacity-70")}>
      <Link href={`/carousel-generator/types/${t.slug}` as never} className="truncate text-left text-[15px] font-semibold tracking-[-0.01em] underline decoration-transparent underline-offset-4 hover:decoration-text-muted" title={t.name}>
        {t.name}
      </Link>
      <div className="flex flex-wrap gap-1.5">
        <Pill>{t.character}</Pill>
        {slidesText(t) && <Pill className="tnum">{slidesText(t)}</Pill>}
      </div>
      <div className="border-y border-border">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between py-2.5 text-xs font-medium text-text-muted hover:text-text-primary">
          <span>View details</span>
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
        <div className={cn("grid transition-[grid-template-rows] duration-200", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <div className="grid grid-cols-3 gap-2 pb-3">
              <div><div className="text-lg font-semibold tnum">{t.postsLeft ?? "—"}</div><div className="text-[11px] text-text-muted">Posts left</div></div>
              <div><div className={cn("text-lg font-semibold tnum", cover !== null && cover <= 2 && "text-danger")}>{cover ?? "—"}</div><div className="text-[11px] text-text-muted">Days of cover</div></div>
              <div><div className="text-lg font-semibold tnum">{t.medianViews !== null ? t.medianViews.toLocaleString() : "—"}</div><div className="text-[11px] text-text-muted">Median views</div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {t.lifecycle === "not_wired" && <Pill>Not wired</Pill>}
        {!t.writing && !retired && <Pill>Needs writing</Pill>}
        {t.lastBatch && !waiting && t.writing && <span className="text-xs text-text-muted tnum">Last batch {shortDate(t.lastBatch.createdAt)}</span>}
        {waiting && (
          <Link href={waiting.href as never} className="inline-flex items-center gap-1 rounded-full bg-pill-bg px-2.5 py-0.5 text-xs font-medium text-text-primary tnum">
            {waiting.label} <ChevronRight className="size-3" />
          </Link>
        )}
        <span className="ml-auto flex items-center gap-2">
          {retired ? null : running ? (
            <Btn href={`/carousel-generator/batches/${running.id}`}>Open running batch</Btn>
          ) : (
            // Generate always opens the form; the form names what is missing (D13).
            <Accent small href={`/carousel-generator/generate?type=${encodeURIComponent(t.id)}`}>Generate</Accent>
          )}
        </span>
      </div>
    </article>
  );
}

export function TypesView({ initial }: { initial: CarouselType[] | null }) {
  const { data, error, reload } = useJson<{ types: CarouselType[] }>(initial ? null : "/api/carousel-generator/types-full");
  const types = data?.types ?? initial;
  const [retiredOpen, setRetiredOpen] = useState(false);
  if (!types) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold">Carousel types</h1>
        <LoadError message={error ?? "Carousel types could not be loaded"} onRetry={reload} />
      </div>
    );
  }
  const live = types.filter((t) => t.lifecycle !== "retired");
  const retired = types.filter((t) => t.lifecycle === "retired");
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Carousel types</h1>
        <Btn href="/carousel-generator/studio"><Plus className="size-3" />New carousel type</Btn>
      </div>
      {live.length === 0 && retired.length === 0 ? (
        <div data-empty-fill="" className="flex min-h-[360px] flex-1 flex-col items-center justify-center gap-4 rounded-card border border-border bg-card-sunken px-7 py-11 text-center">
          <h4 className="text-base font-semibold">No carousel types</h4>
          <Accent href="/carousel-generator/studio">New carousel type</Accent>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {live.map((t) => (
              <TypeCard key={t.id} t={t} />
            ))}
          </div>
          {retired.length > 0 && (
            <section className="flex flex-col gap-3">
              <button type="button" onClick={() => setRetiredOpen((o) => !o)} aria-expanded={retiredOpen} className="flex w-fit items-center gap-2 text-sm text-text-muted hover:text-text-primary">
                <ChevronRight className={cn("size-3.5 transition-transform", retiredOpen && "rotate-90")} />
                <span>Retired</span>
                <Pill className="tnum">{retired.length}</Pill>
              </button>
              {retiredOpen && (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {retired.map((t) => (
                    <TypeCard key={t.id} t={t} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
