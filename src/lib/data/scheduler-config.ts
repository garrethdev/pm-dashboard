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
