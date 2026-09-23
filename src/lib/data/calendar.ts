import { cache } from "react";
import { CALENDAR_TAG, type Cached, TTL, cachedFetcher } from "@/lib/data/cache";
import { sbRest, sbRpc } from "@/lib/data/supabase";
import type { Fleet } from "@/lib/fleet";

/**
 * Content Calendar — what the Smart Scheduler actually laid down, by day.
 *
 * ONE FLEET AT A TIME (PF-19). Every read here goes to the `_fleet` RPCs, which
 * are the originals limited to the accounts in the fleet being looked at.
 * Garreth's rule (2026-09-18): an account's data follows the account, so
 * moving an account to a real phone moves its whole calendar history with it,
 * with no move-date split. The scheduler run and the shortfalls beside the grid
 * are deliberately NOT per fleet — one run plans the whole fleet, and splitting
 * it would invent two runs that never happened.
 *
 * Two deliberate choices, both learned from the data rather than assumed:
 *
 * 0. Delivery comes from the delivery record, not posting_status. The poster writes
 *    "Posted" optimistically and [Reconcile] Daily Failed Posts only corrects
 *    it at 14:00 ET, hours before the 22:15 posting window closes — so an
 *    evening failure reads as a success until the next day. A row Geelark
 *    failed is counted as `failed` and kept out of `live`; a row nothing has
 *    attempted yet still counts as live, or tomorrow would read as zero.
 *    Since PF-09 there are TWO delivery records, not one: a Geelark task for a
 *    cloud phone, and a `post_deliveries` row for a post handed to a person.
 *    A real iPhone reports nothing back, so without the second one the
 *    Physical fleet's calendar would never show a post as delivered.
 *
 * 1. "Live" means posting_status in (Ready, Posted) — the same filter the
 *    scheduler itself applies. Counting by date alone is wrong: the retired
 *    `rich_life_carousel` lane left ~460 Canceled shells behind, some dated
 *    into 2027, and they would show as real posts on days nothing is planned.
 *    Canceled rows are dropped in the RPCs entirely (Garreth 2026-09-06) —
 *    they never reach a phone, so they are not history. What remains under
 *    "dead" is Hold and Failed: a post that was meant to go out and did not.
 *
 * 2. A content type with no ACTIVE registry row is flagged, not hidden. The
 *    scheduler pushes every post's time into its gap check but only counts
 *    registry lanes toward the daily cap, so a live post from outside the
 *    registry takes a time slot without taking a cap slot — an account could
 *    exceed its own limit. Nothing is doing that today; the flag is what would
 *    make it visible if something started.
 */

/** posting_status values that mean the post is real. Hold/Failed are "dead";
 *  Canceled never reaches this layer — the RPCs filter it out. */
export const LIVE_STATUSES = ["Ready", "Posted"] as const;

export interface CalendarTypeCount {
  contentType: string;
  character: string;
  /** "glp" | "filler" | null when the lane is not in the active registry. */
  bucket: string | null;
  registryLane: boolean;
  live: number;
  dead: number;
  /** Rows that could not be delivered — Geelark failed them, or the person
   *  handed the post marked it failed. Excluded from `live`, not subtracted. */
  failed: number;
  accounts: number;
}

export interface CalendarDay {
  /** ISO date, ET calendar. */
  date: string;
  types: CalendarTypeCount[];
  live: number;
  dead: number;
  failed: number;
  /** Distinct accounts with at least one live post. */
  accounts: number;
  /** True when any live post sits outside the active registry. */
  offRegistry: boolean;
  run: SchedulerRun | null;
  /** Physical only (P11): posts marked posted by hand whose link has not been
   *  added yet. Absent on Cloud, where Geelark reports the post itself. */
  linkNeeded?: number;
}

export interface SchedulerRun {
  runAt: string;
  status: string;
  dryRun: boolean;
  accountsConsidered: number;
  slotsPlanned: number;
  rowsScheduled: number;
  shortfallCount: number;
  errorStep: string | null;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface CalendarMonth {
  /** First and last date covered, inclusive (the full grid, not just the month). */
  start: string;
  end: string;
  days: CalendarDay[];
  /** Every content type seen in the window, for the legend. */
  legend: { contentType: string; bucket: string | null; registryLane: boolean }[];
}

interface RawRollup {
  day: string;
  content_type: string;
  character: string;
  bucket: string | null;
  registry_lane: boolean;
  live_n: number | string;
  dead_n: number | string;
  failed_n: number | string;
  accounts: number | string;
}

interface RawRun {
  run_at: string;
  status: string;
  dry_run: boolean;
  accounts_considered: number | null;
  slots_planned: number | null;
  rows_scheduled: number | null;
  shortfall_count: number | null;
  error_step: string | null;
  error_message: string | null;
  duration_ms: number | null;
}

const n = (v: number | string | null | undefined) => Number(v ?? 0);

function toRun(r: RawRun): SchedulerRun {
  return {
    runAt: r.run_at,
    status: r.status,
    dryRun: r.dry_run,
    accountsConsidered: n(r.accounts_considered),
    slotsPlanned: n(r.slots_planned),
    rowsScheduled: n(r.rows_scheduled),
    shortfallCount: n(r.shortfall_count),
    errorStep: r.error_step,
    errorMessage: r.error_message,
    durationMs: r.duration_ms,
  };
}

/** Today in the scheduler's own calendar (America/New_York), as YYYY-MM-DD. */
export function etToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

/** Add days to an ISO date without tripping over local time zones. */
export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * The earliest day whose calendar can still change.
 *
 * Today is obvious — the poster runs 11:00–22:15 ET, so today's row grows all
 * day. Yesterday counts too: [Reconcile] Daily Failed Posts rewrites the
 * previous day's posting_status at 14:00 ET, so a copy taken this morning is
 * wrong by this afternoon. Anything older is finished and safe to remember.
 */
export function unsettledFrom(): string {
  return addDays(etToday(), -1);
}

/**
 * The 6x7 grid a month is drawn on: the 1st back to its Monday, forward to the
 * Sunday after the last. Returned as dates so the caller never does calendar
 * arithmetic in the component.
 */
export function monthGridRange(year: number, month1: number): { start: string; end: string } {
  const first = new Date(Date.UTC(year, month1 - 1, 1));
  const last = new Date(Date.UTC(year, month1, 0));
  const dowMon1 = (first.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - dowMon1);
  const end = new Date(last);
  end.setUTCDate(last.getUTCDate() + (6 - ((last.getUTCDay() + 6) % 7)));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * One month of the calendar, including the leading/trailing days that fill the
 * grid. Cached per range — a past month never changes, and the current one is
 * only as stale as the Supabase TTL.
 */
/**
 * Deduped per request, not just cached.
 *
 * The Content Calendar page reads this twice — once for the grid, once for the
 * run pill beside the title — and for the current month `bypass` is on, so the
 * cache deliberately does not answer either call. Without React's `cache()`
 * that is two live reads fanning out to three Supabase queries each, six round
 * trips where three would do. `cache()` scopes to a single request, so it
 * collapses the duplicate without touching the freshness `bypass` exists for.
 */
export const getCalendarMonth = cache(async function getCalendarMonth(
  year: number,
  month1: number,
  fleet: Fleet = "cloud",
): Promise<Cached<CalendarMonth>> {
  const { start, end } = monthGridRange(year, month1);
  return cachedFetcher(
    // v3, and the fleet is part of the key: two people looking at two fleets
    // must not be served each other's grid.
    // v4: days carry linkNeeded (P11).
    `calendar-month-v4:${fleet}:${start}:${end}`,
    TTL.supabase,
    async (): Promise<CalendarMonth> => {
      const [raw, dayTotals, runs] = await Promise.all([
        sbRpc<RawRollup[]>("calendar_month_rollup_fleet", {
          p_start: start,
          p_end: end,
          p_fleet: fleet,
        }),
        // Day-level totals are their own aggregate: a distinct account count
        // cannot be recovered from the per-type rows without double-counting
        // an account that posts more than one type.
        sbRpc<
          {
            day: string;
            live_n: number | string;
            dead_n: number | string;
            failed_n: number | string;
            accounts: number | string;
            off_registry: boolean;
            link_needed: number | string;
          }[]
        >("calendar_month_days_fleet", { p_start: start, p_end: end, p_fleet: fleet }),
        // One row per scheduler run in the window. Runs are keyed by run_at,
        // not by the day they scheduled FOR — the 06:30 ET cron plans that
        // same day, so the run's own date is the right key. Not filtered by
        // fleet: one run plans everything, so both fleets show the same run.
        sbRest<RawRun[]>(
          "scheduler_runs?select=run_at,status,dry_run,accounts_considered,slots_planned," +
            `rows_scheduled,shortfall_count,error_step,error_message,duration_ms` +
            `&run_at=gte.${start}&run_at=lt.${addDays(end, 1)}&order=run_at.desc`,
        ).catch(() => []),
      ]);

      // Latest run wins for a day: a manual re-run after a failure is the one
      // that describes what actually happened.
      const runByDay = new Map<string, SchedulerRun>();
      for (const r of runs) {
        const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(
          new Date(r.run_at),
        );
        if (!runByDay.has(day)) runByDay.set(day, toRun(r));
      }

      const byDay = new Map<string, CalendarTypeCount[]>();
      for (const r of raw) {
        const list = byDay.get(r.day) ?? [];
        list.push({
          contentType: r.content_type,
          character: r.character,
          bucket: r.bucket,
          registryLane: r.registry_lane,
          live: n(r.live_n),
          dead: n(r.dead_n),
          failed: n(r.failed_n),
          accounts: n(r.accounts),
        });
        byDay.set(r.day, list);
      }

      const totalsByDay = new Map(dayTotals.map((t) => [t.day, t]));

      const days: CalendarDay[] = [];
      for (let d = start; d <= end; d = addDays(d, 1)) {
        const types = byDay.get(d) ?? [];
        const t = totalsByDay.get(d);
        days.push({
          date: d,
          types,
          live: n(t?.live_n),
          dead: n(t?.dead_n),
          failed: n(t?.failed_n),
          accounts: n(t?.accounts),
          offRegistry: t?.off_registry ?? false,
          run: runByDay.get(d) ?? null,
          // Only a Physical day can owe a link, so Cloud days leave it off.
          ...(n(t?.link_needed) > 0 ? { linkNeeded: n(t?.link_needed) } : {}),
        });
      }

      const legend = [...new Map(raw.map((r) => [r.content_type, r])).values()]
        .map((r) => ({
          contentType: r.content_type,
          bucket: r.bucket,
          registryLane: r.registry_lane,
        }))
        .sort((a, b) => a.contentType.localeCompare(b.contentType));

      return { start, end, days, legend };
    },
    {
      tags: [CALENDAR_TAG],
      // A grid that reaches into the unsettled days is read live. Past months
      // are fully settled, so they stay cached and cost nothing.
      bypass: end >= unsettledFrom(),
    },
  )();
});

/**
 * What actually happened to the row.
 *
 * `posting_status` is written optimistically by the poster and only corrected
 * by [Reconcile] Daily Failed Posts at 14:00 ET, so an evening failure reads
 * "Posted" until the next day's reconcile. This comes from the delivery record
 * instead — a Geelark task for a cloud phone, polled per task, or a
 * `post_deliveries` row for a post a person was handed (PF-09) — and is the
 * earliest honest answer available on either fleet.
 *
 * `pending` also covers a hand-posted delivery somebody skipped. Nothing in
 * the app writes that status today, and reading it as still outstanding keeps
 * the row on screen rather than letting it read as never attempted.
 */
export type Delivery = "posted" | "failed" | "pending" | "none";

/**
 * Where a post handed to a person stands (P11), in the To-do list's own words.
 * `Delivery` folds these into three; the Physical day view needs all five,
 * because "posted but the link is still owed" and "skipped" are not the same
 * thing as done or waiting. Null for a Cloud post, and for a Physical post not
 * handed out yet (before the 10:00 ET run).
 */
export type HandDelivery = "queued" | "posted" | "postedNoLink" | "failed" | "skipped";

export interface CalendarPost {
  contentType: string;
  bucket: string | null;
  registryLane: boolean;
  /** Raw string as stored — the column holds both "14:30" and "2:30 PM". */
  time: string | null;
  minuteOfDay: number | null;
  status: string;
  contentId: string | null;
  live: boolean;
  delivery: Delivery;
  /** The code and message behind a failure, present only on one. Geelark's own
   *  on the Cloud fleet; on Physical there is no code, and the message is the
   *  note the person left when they marked the post failed. */
  failCode: string | null;
  failDesc: string | null;
  /** Physical only (P11). See HandDelivery. */
  hand?: HandDelivery | null;
  /** Physical only: the link the person pasted when they marked it posted. */
  postUrl?: string | null;
}

export interface CalendarDayAccount {
  profile: string;
  username: string | null;
  character: string;
  platform: string;
  health: string | null;
  isActive: boolean;
  paused: boolean;
  posts: CalendarPost[];
  live: number;
  glp: number;
  filler: number;
  /** Rows that could not be delivered, however posting_status reads. */
  failed: number;
}

export interface CalendarDayDetail {
  date: string;
  accounts: CalendarDayAccount[];
  run: SchedulerRun | null;
  shortfalls: { character: string; contentType: string; slotsMissed: number; reason: string }[];
  totals: { live: number; dead: number; accounts: number; glp: number; filler: number; failed: number };
}

interface RawDetail {
  geelark_profile: string;
  username: string | null;
  character: string;
  platform: string;
  health: string | null;
  is_active: boolean;
  posting_paused: boolean;
  content_type: string;
  bucket: string | null;
  registry_lane: boolean;
  posting_time: string | null;
  minute_of_day: number | null;
  posting_status: string;
  content_id: string | null;
  delivery: Delivery;
  fail_code: string | null;
  fail_desc: string | null;
  hand: string | null;
  post_url: string | null;
}

const HAND_DELIVERIES: readonly string[] = [
  "queued",
  "posted",
  "postedNoLink",
  "failed",
  "skipped",
] satisfies HandDelivery[];

/** The RPC's `hand` as a HandDelivery, or null for anything it does not know,
 *  so a new status added in the database shows the post the old way rather
 *  than as a blank pill. */
function toHand(v: string | null): HandDelivery | null {
  return v !== null && HAND_DELIVERIES.includes(v) ? (v as HandDelivery) : null;
}

/** One day expanded: every account in this fleet and what it is scheduled to
 *  post. The run and the shortfalls under it stay fleet-wide — one scheduler
 *  run planned the whole day. */
export async function getCalendarDay(
  date: string,
  fleet: Fleet = "cloud",
): Promise<Cached<CalendarDayDetail>> {
  return cachedFetcher(
    // v5: posts carry hand and postUrl (P11).
    `calendar-day-v5:${fleet}:${date}`,
    TTL.supabase,
    async (): Promise<CalendarDayDetail> => {
      const [rows, runs, shortfalls] = await Promise.all([
        sbRpc<RawDetail[]>("calendar_day_detail_fleet", { p_day: date, p_fleet: fleet }),
        sbRest<RawRun[]>(
          "scheduler_runs?select=run_at,status,dry_run,accounts_considered,slots_planned," +
            `rows_scheduled,shortfall_count,error_step,error_message,duration_ms` +
            `&run_at=gte.${date}&run_at=lt.${addDays(date, 1)}&order=run_at.desc&limit=1`,
        ).catch(() => []),
        sbRest<{ character: string; content_type: string; slots_missed: number; reason: string }[]>(
          `scheduler_shortfalls?select=character,content_type,slots_missed,reason&date=eq.${date}`,
        ).catch(() => []),
      ]);

      const isLive = (s: string) => (LIVE_STATUSES as readonly string[]).includes(s);

      const byAccount = new Map<string, CalendarDayAccount>();
      for (const r of rows) {
        let acct = byAccount.get(r.geelark_profile);
        if (!acct) {
          acct = {
            profile: r.geelark_profile,
            username: r.username,
            character: r.character,
            platform: r.platform,
            health: r.health,
            isActive: r.is_active ?? false,
            paused: r.posting_paused ?? false,
            posts: [],
            live: 0,
            glp: 0,
            filler: 0,
            failed: 0,
          };
          byAccount.set(r.geelark_profile, acct);
        }
        // Same rule as the month rollup: a row Geelark failed is not a post,
        // whatever posting_status still claims. Without this an account reads
        // "3 live · 2 failed", which is two numbers describing three rows.
        const failed = r.delivery === "failed";
        const live = isLive(r.posting_status) && !failed;
        acct.posts.push({
          contentType: r.content_type,
          bucket: r.bucket,
          registryLane: r.registry_lane,
          time: r.posting_time,
          minuteOfDay: r.minute_of_day,
          status: r.posting_status,
          contentId: r.content_id,
          live,
          delivery: r.delivery ?? "none",
          failCode: r.fail_code,
          failDesc: r.fail_desc,
          hand: toHand(r.hand),
          postUrl: r.post_url,
        });
        if (failed) acct.failed++;
        if (live) {
          acct.live++;
          if (r.bucket === "filler") acct.filler++;
          else if (r.bucket === "glp") acct.glp++;
        }
      }

      const accounts = [...byAccount.values()].sort(
        (a, b) =>
          b.live - a.live ||
          a.character.localeCompare(b.character) ||
          a.profile.localeCompare(b.profile),
      );

      return {
        date,
        accounts,
        run: runs[0] ? toRun(runs[0]) : null,
        shortfalls: shortfalls.map((s) => ({
          character: s.character,
          contentType: s.content_type,
          slotsMissed: n(s.slots_missed),
          reason: s.reason,
        })),
        totals: {
          live: accounts.reduce((a, x) => a + x.live, 0),
          dead: rows.filter((r) => !isLive(r.posting_status) && r.delivery !== "failed").length,
          accounts: accounts.filter((a) => a.live > 0).length,
          glp: accounts.reduce((a, x) => a + x.glp, 0),
          filler: accounts.reduce((a, x) => a + x.filler, 0),
          failed: accounts.reduce((a, x) => a + x.failed, 0),
        },
      };
    },
    { tags: [CALENDAR_TAG], bypass: date >= unsettledFrom() },
  )();
}
