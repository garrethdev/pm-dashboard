"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "@/components/ui/icons";
import type {
  CalendarDay,
  CalendarMonth,
  SchedulerRun,
} from "@/lib/data/calendar";
import { CalendarDayPanel } from "@/components/dashboard/calendar-day-panel";
import { DashCard } from "@/components/ui/card";
import { StaleNotice } from "@/components/ui/stale-notice";
import { cn } from "@/lib/utils";

/**
 * Content Calendar — the Smart Scheduler's output as a month grid.
 *
 * Every date here is the scheduler's own ET calendar day, not the viewer's.
 * `posting_date` is a timestamptz used as a date marker (most rows sit at
 * 00:00 UTC), so the data layer reads it at UTC to recover the day the
 * scheduler meant; converting to ET would drag 3,101 of 4,838 rows back a day.
 * The real wall-clock time lives in posting_time and is ET.
 */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthLabel(year: number, month1: number) {
  return new Date(Date.UTC(year, month1 - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shortType(t: string) {
  return t.replace(/_/g, " ");
}

/** Day arithmetic at UTC so a Manila browser cannot walk the date backwards.
 *  Duplicated from the data layer rather than imported: that module reaches for
 *  the service-role Supabase client, which must never enter a client bundle. */
function shiftDay(iso: string, delta: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function ContentCalendar({
  initial,
  initialYear,
  initialMonth,
  today,
  initialFetchedAt,
  initialStale = false,
}: {
  initial: CalendarMonth;
  initialYear: number;
  initialMonth: number;
  /** ET today, resolved on the server so the highlight matches the scheduler. */
  today: string;
  initialFetchedAt: string;
  /** The month came from the last-known-good copy, not from Supabase. */
  initialStale?: boolean;
}) {
  const [month, setMonth] = useState({
    year: initialYear,
    month1: initialMonth,
  });
  const [data, setData] = useState(initial);
  const [stale, setStale] = useState<{ at: string } | null>(
    initialStale ? { at: initialFetchedAt } : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The open day is held as a date, not a CalendarDay: stepping with the panel's
  // arrows can walk off the month currently loaded, and the panel fetches its
  // own rows anyway.
  const [openDay, setOpenDay] = useState<string | null>(null);
  async function go(year: number, month1: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/calendar?month=${year}-${String(month1).padStart(2, "0")}`,
      );
      const body = (await res.json()) as {
        data?: CalendarMonth;
        fetchedAt?: string;
        stale?: boolean;
        error?: string;
      };
      if (!res.ok || !body.data)
        throw new Error(body.error ?? "Could not load that month");
      setData(body.data);
      setStale(body.stale && body.fetchedAt ? { at: body.fetchedAt } : null);
      setMonth({ year, month1 });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load that month",
      );
    } finally {
      setLoading(false);
    }
  }

  const step = (delta: number) => {
    const d = new Date(Date.UTC(month.year, month.month1 - 1 + delta, 1));
    go(d.getUTCFullYear(), d.getUTCMonth() + 1);
  };

  const inMonth = (iso: string) => Number(iso.slice(5, 7)) === month.month1;

  return (
    <div className="flex flex-col gap-6">
      <DashCard
        sunken
        title={monthLabel(month.year, month.month1)}
        actions={
          <div className="flex items-center gap-1">
            {loading && (
              <Loader2 className="mr-1 size-3.5 animate-spin text-text-muted" />
            )}
            <button
              onClick={() => step(-1)}
              disabled={loading}
              aria-label="Previous month"
              className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-card-raised hover:text-text-primary disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => {
                const [y, m] = today.split("-");
                go(Number(y), Number(m));
              }}
              disabled={loading}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-card-raised hover:text-text-primary disabled:opacity-40"
            >
              Today
            </button>
            <button
              onClick={() => step(1)}
              disabled={loading}
              aria-label="Next month"
              className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-card-raised hover:text-text-primary disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        }
      >
        {error && (
          <p className="mb-4 rounded-nested bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        {stale && <StaleNotice fetchedAt={stale.at} className="mb-4" />}

        <div className="overflow-x-auto">
          <div className="min-w-[46rem]">
            <div className="grid grid-cols-7 gap-1.5 pb-2">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-1 text-xs font-medium text-text-muted"
                >
                  {d}
                </div>
              ))}
            </div>
            <div
              className={cn(
                "grid grid-cols-7 gap-1.5",
                loading && "opacity-50",
              )}
            >
              {data.days.map((day) => (
                <DayCell
                  key={day.date}
                  day={day}
                  muted={!inMonth(day.date)}
                  isToday={day.date === today}
                  onOpen={() => setOpenDay(day.date)}
                />
              ))}
            </div>
          </div>
        </div>

      </DashCard>

      {openDay && (
        <CalendarDayPanel
          date={openDay}
          today={today}
          onClose={() => setOpenDay(null)}
          onStep={(delta) => setOpenDay((d) => (d ? shiftDay(d, delta) : d))}
        />
      )}
    </div>
  );
}

function DayCell({
  day,
  muted,
  isToday,
  onOpen,
}: {
  day: CalendarDay;
  muted: boolean;
  isToday: boolean;
  onOpen: () => void;
}) {
  // Only live posts earn a pill. Held and failed rows are a quiet footnote;
  // cancelled rows never arrive at all (the RPCs drop them), so nothing here
  // can invent a post from the retired rich_life_carousel lane's ~460 shells.
  //
  // The rollup is per (day, type, character), so a type shared by several
  // characters — filler runs on all three — arrives as several rows and would
  // render as "filler 14 / filler 14 / filler 9". The cell answers "what is
  // going out today", so types are merged here and the per-character split is
  // left to the day view.
  const merged = new Map<
    string,
    {
      contentType: string;
      bucket: string | null;
      registryLane: boolean;
      live: number;
      chars: string[];
    }
  >();
  for (const t of day.types) {
    if (t.live <= 0) continue;
    const m = merged.get(t.contentType);
    if (m) {
      m.live += t.live;
      m.chars.push(`${t.character} ${t.live}`);
    } else {
      merged.set(t.contentType, {
        contentType: t.contentType,
        bucket: t.bucket,
        registryLane: t.registryLane,
        live: t.live,
        chars: [`${t.character} ${t.live}`],
      });
    }
  }
  const live = [...merged.values()].sort(
    (a, b) => b.live - a.live || a.contentType.localeCompare(b.contentType),
  );
  const shown = live.slice(0, 3);
  const rest = live.length - shown.length;

  // A button, not a div with a handler: every cell is openable, including an
  // empty one — "nothing went out here" is an answer the day view can give.
  //
  // The layout lives in an inner div rather than on the button itself. A
  // <button> is not a dependable flex container — engines wrap its content in
  // an anonymous box — which is why `justify-between` on a direct child left
  // the post count sitting against the date instead of at the far edge.
  //
  // That same anonymous box CENTERS short content vertically, which is why the
  // wrapper needs h-full: without it, a near-empty cell (today, before the
  // 06:30 run) floated its date to the middle while every other date sat at
  // the top. Verified from a screenshot, not from the markup.
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${day.date}, ${day.live} post${day.live === 1 ? "" : "s"}`}
      className={cn(
        "block min-h-[9rem] rounded-nested border p-2.5 text-left transition-colors",
        "hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
        muted
          ? "border-border/50 bg-transparent opacity-45"
          : "border-border/70 bg-bg/60",
        isToday && "opacity-100",
      )}
    >
      <div className="flex h-full min-h-[8rem] w-full flex-col gap-2">
        {/* A rule under the date and count, so the content pills below read as a
            separate list rather than running on from the header. */}
        <div className="flex w-full items-center justify-between gap-1 border-b border-border/60 pb-2">
          {/* Every date gets the same disc-sized box and only today gets the
              fill. Giving the circle to today alone made it a flex box among
              baseline-aligned text, which dropped it below the other numbers. */}
          <span
            className={cn(
              "flex size-[1.375rem] shrink-0 items-center justify-center rounded-full text-sm font-bold tnum",
              isToday ? "bg-accent/15 text-accent" : "text-text-primary",
            )}
          >
            {Number(day.date.slice(8, 10))}
          </span>
          {day.live > 0 && (
            <span
              className="text-xs whitespace-nowrap text-text-muted tnum"
              title={`${day.live} post${day.live === 1 ? "" : "s"} across ${day.accounts} account${day.accounts === 1 ? "" : "s"}`}
            >
              <span className="font-semibold text-text-primary">
                {day.live}
              </span>{" "}
              posts
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {shown.map((t) => (
            <span
              key={t.contentType}
              title={`${shortType(t.contentType)}: ${t.live} post${t.live === 1 ? "" : "s"} (${t.chars.join(", ")})`}
              className="flex items-center justify-between gap-1 rounded-full border border-border/70 bg-card-raised/50 px-1.5 py-0.5 text-[11px] leading-tight text-text-muted"
            >
              <span className="truncate">{shortType(t.contentType)}</span>
              <span className="tnum shrink-0 font-semibold">{t.live}</span>
            </span>
          ))}
          {rest > 0 && (
            <span className="px-1.5 text-[11px] text-text-muted">
              +{rest} more
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          {day.failed > 0 && (
            <span
              title={`${day.failed} post${day.failed === 1 ? "" : "s"} Geelark could not deliver`}
              className="inline-flex items-center rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger"
            >
              {day.failed} failed
            </span>
          )}
          {day.run && <RunPill run={day.run} />}
          {day.offRegistry && (
            <span title="Outside the active registry">
              <AlertTriangle className="size-3 text-warn" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * A day's run, but only when it went wrong. A green tick on every ordinary day
 * is noise — the cell is already dense — so success shows nothing and the two
 * states worth chasing get a pill each (Garreth 2026-09-06).
 */
function RunPill({ run }: { run: SchedulerRun }) {
  if (run.status === "error") {
    return (
      <span
        title={`Scheduler failed at ${run.errorStep ?? "an unknown step"}${run.errorMessage ? `: ${run.errorMessage}` : ""}`}
        className="inline-flex items-center rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger"
      >
        error
      </span>
    );
  }
  if (run.shortfallCount > 0) {
    return (
      <span
        title={`${run.shortfallCount} slot${run.shortfallCount === 1 ? "" : "s"} the scheduler could not fill`}
        className="inline-flex items-center rounded-full bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn"
      >
        {run.shortfallCount} short
      </span>
    );
  }
  return null;
}
