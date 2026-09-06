import { TTL, cachedFetcher } from "@/lib/data/cache";
import { sbRest } from "@/lib/data/supabase";

/**
 * v_scheduler_account_config — Smart Scheduler 1.0.1's per-account view of the
 * limits it will actually enforce.
 *
 * This belongs beside cadence because the registry cadence is only half the
 * story: a lane may ask for 10 GLP posts a week, but each account carries its
 * own daily ceilings, a minimum gap, a posting window, and a health-derived
 * throttle. When the two disagree, the account config wins — so reading the
 * cadence table alone will over-predict what gets posted.
 *
 * Read-only. Caps live in the scheduler; the dashboard never writes them.
 */
export interface AccountConfigRow {
  geelarkProfile: string;
  character: string | null;
  platform: string | null;
  ageDays: number | null;
  health: string | null;
  glpWeekCap: number | null;
  fillerWeekCap: number | null;
  maxPostsPerDay: number | null;
  maxGlpPerDay: number | null;
  maxFillerPerDay: number | null;
  minGapMinutes: number | null;
  spacingMinutes: number | null;
  /** Minutes past ET midnight — 660 = 11:00. */
  windowStartMin: number | null;
  windowEndMin: number | null;
  attempts7d: number;
  fails7d: number;
  /** 0–1, not a percentage. */
  failRate7d: number | null;
  canDeliver: boolean;
  /** e.g. "health: shadowbanned"; null when nothing is throttling the account. */
  throttleReason: string | null;
}

export interface SchedulerConfigData {
  rows: AccountConfigRow[];
  /** Accounts the scheduler will refuse to deliver to right now. */
  blocked: number;
  /** Accounts still delivering but under a reduced cap. */
  throttled: number;
}

/** 660 → "11:00". The view stores the posting window as ET minutes-past-midnight. */
export function minutesToEt(min: number | null): string {
  if (min === null || min === undefined) return "—";
  const h = Math.floor(min / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

const num = (v: string | number | null | undefined) => (v == null ? null : Number(v));

async function fetchSchedulerConfig(): Promise<SchedulerConfigData> {
  const raw = await sbRest<
    {
      geelark_profile: string;
      character: string | null;
      platform: string | null;
      age_days: number | null;
      health: string | null;
      glp_week_cap: number | null;
      fil_week_cap: number | null;
      max_posts_per_day: number | null;
      max_glp_per_day: number | null;
      max_filler_per_day: number | null;
      min_gap_minutes: number | null;
      spacing_minutes: number | null;
      window_start_min: number | null;
      window_end_min: number | null;
      deliv_attempts_7d: string | number | null;
      deliv_fails_7d: string | number | null;
      deliv_fail_rate_7d: string | number | null;
      can_deliver: boolean;
      throttle_reason: string | null;
    }[]
  >(
    "v_scheduler_account_config?select=geelark_profile,character,platform,age_days,health," +
      "glp_week_cap,fil_week_cap,max_posts_per_day,max_glp_per_day,max_filler_per_day," +
      "min_gap_minutes,spacing_minutes,window_start_min,window_end_min," +
      "deliv_attempts_7d,deliv_fails_7d,deliv_fail_rate_7d,can_deliver,throttle_reason" +
      // Blocked first, then the highest failure rates — the rows worth acting on.
      "&order=can_deliver.asc,deliv_fail_rate_7d.desc.nullslast,geelark_profile.asc",
  );

  const rows = raw.map(
    (r): AccountConfigRow => ({
      geelarkProfile: r.geelark_profile,
      character: r.character,
      platform: r.platform,
      ageDays: r.age_days,
      health: r.health,
      glpWeekCap: r.glp_week_cap,
      fillerWeekCap: r.fil_week_cap,
      maxPostsPerDay: r.max_posts_per_day,
      maxGlpPerDay: r.max_glp_per_day,
      maxFillerPerDay: r.max_filler_per_day,
      minGapMinutes: r.min_gap_minutes,
      spacingMinutes: r.spacing_minutes,
      windowStartMin: r.window_start_min,
      windowEndMin: r.window_end_min,
      attempts7d: Number(r.deliv_attempts_7d ?? 0),
      fails7d: Number(r.deliv_fails_7d ?? 0),
      failRate7d: num(r.deliv_fail_rate_7d),
      canDeliver: r.can_deliver === true,
      throttleReason: r.throttle_reason,
    }),
  );

  return {
    rows,
    blocked: rows.filter((r) => !r.canDeliver).length,
    throttled: rows.filter((r) => r.canDeliver && r.throttleReason !== null).length,
  };
}

export const getSchedulerConfig = cachedFetcher(
  "scheduler-config",
  TTL.supabase,
  fetchSchedulerConfig,
);

/**
 * Fleet defaults — the scheduler_buckets row pair, which is where an account's
 * limits start before overrides, the age ramp and the health throttle touch
 * them. These apply to EVERY account, unlike the per-account overrides.
 *
 * v_scheduler_account_config reads them with max() across both bucket rows, so
 * if the glp and filler rows ever disagree the higher value silently wins.
 * `divergent` surfaces that rather than letting the editor show one number and
 * the scheduler use another.
 */
export interface FleetDefaults {
  maxPostsPerDay: number;
  minGapMinutes: number;
  /** "11:00" — ET wall clock, stored as a bare time. */
  windowStart: string;
  windowEnd: string;
  /** GLP posts per week per account. */
  glpWeek: number;
  /** Filler posts per week per account. */
  fillerWeek: number;
  /** Filler posts per day per account (scheduler_buckets filler quota_value). */
  fillerPerDay: number;
  divergent: boolean;
}

interface RawBucket {
  bucket: string;
  quota_value: number | null;
  weekly_quota: number | null;
  time_window_start: string | null;
  time_window_end: string | null;
  min_gap_minutes: number | null;
  max_posts_per_day_per_profile: number | null;
}

/** "11:00:00" → "11:00". The column is a bare time; seconds are always zero. */
export function hhmm(t: string | null | undefined): string {
  return (t ?? "").slice(0, 5);
}

async function fetchFleetDefaults(): Promise<FleetDefaults> {
  const rows = await sbRest<RawBucket[]>(
    "scheduler_buckets?select=bucket,quota_value,weekly_quota,time_window_start,time_window_end," +
      "min_gap_minutes,max_posts_per_day_per_profile",
  );
  const glp = rows.find((r) => r.bucket === "glp");
  const filler = rows.find((r) => r.bucket === "filler");

  const shared = <K extends keyof RawBucket>(k: K) =>
    rows.map((r) => r[k]).filter((v) => v !== null && v !== undefined);
  const divergent = (["min_gap_minutes", "max_posts_per_day_per_profile", "time_window_start", "time_window_end"] as const).some(
    (k) => new Set(shared(k)).size > 1,
  );

  return {
    // The view takes max(); mirror it so the editor shows what is in force.
    maxPostsPerDay: Math.max(...rows.map((r) => r.max_posts_per_day_per_profile ?? 3)),
    minGapMinutes: Math.max(...rows.map((r) => r.min_gap_minutes ?? 120)),
    windowStart: hhmm(rows.map((r) => r.time_window_start).sort().at(-1) ?? "11:00:00"),
    windowEnd: hhmm(rows.map((r) => r.time_window_end).sort().at(-1) ?? "22:15:00"),
    glpWeek: glp?.weekly_quota ?? 10,
    fillerWeek: filler?.weekly_quota ?? 10,
    fillerPerDay: filler?.quota_value ?? 2,
    divergent,
  };
}

export const getFleetDefaults = cachedFetcher(
  "scheduler-buckets",
  TTL.supabase,
  fetchFleetDefaults,
);
