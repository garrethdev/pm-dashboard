import { Suspense } from "react";
import { AccountLimitsTable } from "@/components/dashboard/account-limits-table";
import { AdjustCadenceButton } from "@/components/dashboard/adjust-cadence-button";
import { ContentCalendar } from "@/components/dashboard/content-calendar";
import { SchedulerRunPill } from "@/components/dashboard/scheduler-run-pill";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { getCadence } from "@/lib/data/cadence";
import { etToday, getCalendarMonth } from "@/lib/data/calendar";
import { getFleetDefaults, getSchedulerConfig } from "@/lib/data/scheduler-config";

/**
 * Content Calendar — the Smart Scheduler's activity, by day, with the
 * per-account limits that explain it underneath.
 *
 * The month opened is ET "today", not the viewer's: the scheduler plans on the
 * America/New_York calendar, so a Manila evening is still the same ET day and
 * the page must agree with the run it is describing.
 */
async function CalendarLive() {
  const today = etToday();
  const year = Number(today.slice(0, 4));
  const month1 = Number(today.slice(5, 7));

  // Fetch inside the try, build JSX outside it: JSX returned from a try block
  // is not actually rendered there, so a render-time error would escape the
  // catch anyway and the guard would be a lie.
  let data, fetchedAt, stale;
  try {
    ({ data, fetchedAt, stale } = await getCalendarMonth(year, month1));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return (
      <DashCard title="Content calendar">
        <p className="text-sm text-text-muted">Supabase unreachable: {message}</p>
      </DashCard>
    );
  }

  return (
    <ContentCalendar
      initial={data}
      initialYear={year}
      initialMonth={month1}
      today={today}
      initialFetchedAt={fetchedAt}
      initialStale={stale ?? false}
    />
  );
}

/** Today's run, beside the page title. Shares the grid's month payload through
 *  the request-scoped dedupe on getCalendarMonth, so it costs no extra reads —
 *  the TTL cache alone would not do it, since the current month is read live. */
async function RunPill() {
  const today = etToday();
  let data;
  try {
    ({ data } = await getCalendarMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7))));
  } catch {
    return null;
  }
  return <SchedulerRunPill run={data.days.find((d) => d.date === today)?.run ?? null} />;
}

/** The fleet-wide editor. Rendered in the header, so a Supabase hiccup hides
 *  the button rather than breaking the page it sits on. */
async function CadenceEditor() {
  let cadence, fleet;
  try {
    [cadence, fleet] = await Promise.all([getCadence(), getFleetDefaults()]);
  } catch {
    return null;
  }
  return <AdjustCadenceButton cadence={cadence.data} fleet={fleet.data} />;
}

async function AccountLimits() {
  let data;
  try {
    ({ data } = await getSchedulerConfig());
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return (
      <DashCard title="Per-account posting limits">
        <p className="text-sm text-text-muted">Supabase unreachable: {message}</p>
      </DashCard>
    );
  }

  return <AccountLimitsTable data={data} />;
}

export default function ContentCalendarPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Same shape as a card header: on a phone the title and the one action
          share the first line and the status pill drops beneath, because
          "Smart Scheduler not yet run" is too wide to sit beside either.
          `sm:contents` dissolves the pairing above that, so the desktop header
          stays the single row it has always been. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2.5">
        <div className="flex items-center justify-between gap-3 sm:contents">
          <h1 className="text-xl font-semibold">Content calendar</h1>
          <div className="shrink-0 sm:order-last sm:ml-auto">
            <Suspense fallback={null}>
              <CadenceEditor />
            </Suspense>
          </div>
        </div>
        <Suspense fallback={null}>
          <RunPill />
        </Suspense>
      </div>
      <Suspense fallback={<CardSkeleton title="Content calendar" lines={12} />}>
        <CalendarLive />
      </Suspense>
      <Suspense fallback={<CardSkeleton title="Per-account posting limits" lines={10} />}>
        <AccountLimits />
      </Suspense>
    </div>
  );
}
