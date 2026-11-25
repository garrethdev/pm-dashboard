/**
 * The two automatic account rules, as pure functions (Garreth, 2026-11-25).
 *
 * RULE 1, zero views (TikTok only). An account whose last three posts all got
 * 0 views has its posting paused and its warmups handed to a person. After 2
 * days on which both warmups were finished by hand, it is put back the way it
 * was. If it gets three 0-view posts in a row AGAIN after that, it stays
 * paused and the bell asks for it to be retired: "Having consecutive 0 view
 * post even after human intervention is a clear signal of a collapsing
 * account that we should retire."
 *
 * RULE 2, robot failing (TikTok and Instagram). An Automated account that has
 * gone 2 working days without a finished warmup is handed to a person for one
 * day, then back to Automated once both of that day's warmups are done.
 *
 * Days off never count (Garreth: "No, Sunday should not count").
 *
 * The reading and writing are in src/server/auto-holds.ts; everything here can
 * be tested without a database.
 */
import { SESSION_TARGET_MINUTES, SESSIONS_PER_DAY } from "@/lib/data/warmup-sessions";
import { isDayOff, workingDaysBetween } from "@/lib/data/work-week-rules";

export type HoldRule = "zero_views" | "zero_views_again" | "robot_failing";
export type HoldOutcome = "restored" | "overridden" | "retired";

/** Days of finished hand warmups before a zero-views hold is put back. */
export const ZERO_VIEWS_HOLD_DAYS = 2;
/** Days of finished hand warmups before a robot-failing hold is put back. */
export const ROBOT_FAILING_HOLD_DAYS = 1;
/** Full working days with no finished warmup before Rule 2 steps in. */
export const ROBOT_FAILING_MISSED_DAYS = 2;
/** Posts in a row at 0 views that set Rule 1 off. */
export const ZERO_STREAK = 3;
/**
 * A view count read sooner than this after posting is not trusted to be 0.
 * The same line the ban baseline uses (2026-11-06): reads under 12 hours old
 * are ignored, because TikTok often has not counted anything yet.
 */
export const MIN_READ_AGE_HOURS = 12;

/** The New York calendar date of an instant, as YYYY-MM-DD. */
export function etDay(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(at);
}

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- Rule 1

/** One reading of one post's views, as the analytics robots record it. */
export interface PostRead {
  postId: string;
  postedAt: string;
  views: number | null;
  /** When this reading was taken. */
  readAt: string;
}

/**
 * Whether the account's newest three posts all got 0 views.
 *
 * Only posts made after `since` count: after a hold ends, the zeros that set
 * it off must not set it off again.
 *
 * Every one of the three must have a reading taken at least 12 hours after it
 * went up, and the best of those readings must be exactly 0. A post too new
 * to have such a reading means "not yet": the answer waits for it rather than
 * skipping past it, because skipping would judge older posts while the newest
 * one may already be doing fine.
 */
export function hasZeroStreak(reads: PostRead[], since: string | null = null): boolean {
  const posts = new Map<string, { postedAt: string; best: number | null }>();
  const after = since ? Date.parse(since) : null;
  for (const r of reads) {
    if (after !== null && Date.parse(r.postedAt) <= after) continue;
    const post = posts.get(r.postId) ?? { postedAt: r.postedAt, best: null };
    const ageHours = (Date.parse(r.readAt) - Date.parse(r.postedAt)) / 3_600_000;
    if (r.views !== null && ageHours >= MIN_READ_AGE_HOURS) {
      post.best = Math.max(post.best ?? 0, r.views);
    }
    posts.set(r.postId, post);
  }
  const newest = [...posts.values()]
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    .slice(0, ZERO_STREAK);
  return newest.length === ZERO_STREAK && newest.every((p) => p.best === 0);
}

// ---------------------------------------------------------------- Rule 2

/**
 * Full working days with no finished warmup, counted between the last
 * finished one (or the move onto the phone, for an account never warmed) and
 * today. Today is not counted: at the time of the check it has barely begun.
 * Days off are left out.
 *
 * Last warmed Monday, checked early Thursday: Tuesday and Wednesday were
 * missed, so 2.
 */
export function missedWarmupDays(
  lastFinishedAt: string | null,
  movedToDeviceAt: string | null,
  now: Date,
  daysOff: readonly number[],
): number | null {
  const from = lastFinishedAt ?? movedToDeviceAt;
  if (!from) return null;
  const fromDay = etDay(new Date(from));
  const yesterday = addDays(etDay(now), -1);
  if (yesterday <= fromDay) return 0;
  return workingDaysBetween(fromDay, yesterday, daysOff);
}

// ------------------------------------------------------------- restoring

export interface SessionLite {
  startedAt: string;
  minutes: number;
  sessionNo: number;
  mode: "manual" | "script";
}

/**
 * New York days, from `startDay` on, on which both of the day's warmups were
 * finished by hand. Minutes add up per session across rows, the same way the
 * To-do list decides a warmup is done.
 */
export function daysBothWarmupsDone(sessions: SessionLite[], startDay: string): number {
  const minutes = new Map<string, number>();
  for (const s of sessions) {
    if (s.mode !== "manual") continue;
    const day = etDay(new Date(s.startedAt));
    if (day < startDay) continue;
    const key = `${day}#${s.sessionNo}`;
    minutes.set(key, (minutes.get(key) ?? 0) + s.minutes);
  }
  const days = new Set<string>();
  for (const key of minutes.keys()) days.add(key.split("#")[0]!);
  let done = 0;
  for (const day of days) {
    let all = true;
    for (let n = 1; n <= SESSIONS_PER_DAY; n += 1) {
      if ((minutes.get(`${day}#${n}`) ?? 0) < SESSION_TARGET_MINUTES) all = false;
    }
    if (all) done += 1;
  }
  return done;
}

// ------------------------------------------------------------- open holds

export interface OpenHold {
  rule: HoldRule;
  startDay: string;
  daysNeeded: number | null;
}

export interface HeldAccountNow {
  isActive: boolean;
  postingPaused: boolean;
  warmupMode: "manual" | "script";
}

/**
 * What to do with a hold that is still open.
 *
 * A person always wins: if somebody unpaused a paused account, or set a
 * handed-over account back to Automated, the dashboard steps aside rather
 * than fight them.
 */
export function settleOpenHold(
  hold: OpenHold,
  account: HeldAccountNow | null,
  sessions: SessionLite[],
): HoldOutcome | null {
  if (!account || !account.isActive) return "retired";
  if (hold.rule === "robot_failing") {
    if (account.warmupMode === "script") return "overridden";
  } else if (!account.postingPaused) {
    return "overridden";
  }
  if (hold.rule === "zero_views_again" || hold.daysNeeded === null) return null;
  return daysBothWarmupsDone(sessions, hold.startDay) >= hold.daysNeeded ? "restored" : null;
}

/** Whether a day is one the team works (for starting Rule 2). */
export function isWorkingDay(day: string, daysOff: readonly number[]): boolean {
  return !isDayOff(day, daysOff);
}

// ------------------------------------------------------------------ copy

/** "@name", or the profile when the account has no username yet. */
export function accountName(username: string | null, profile: string): string {
  return username ? `@${username}` : profile;
}

export interface BellCopy {
  severity: "critical" | "warning" | "success" | "info";
  title: string;
  body: string;
}

export function startCopy(rule: HoldRule, name: string, missedDays?: number): BellCopy {
  switch (rule) {
    case "zero_views":
      return {
        severity: "warning",
        title: `${name} paused: last 3 posts got 0 views`,
        body: `Posting paused and warmups set to Manual. It goes back after ${ZERO_VIEWS_HOLD_DAYS} days of hand warmups`,
      };
    case "zero_views_again":
      return {
        severity: "critical",
        title: `${name} got 0 views again. Retire it?`,
        body: "Its last 3 posts got 0 views after the hand warmups too. Posting stays paused",
      };
    case "robot_failing":
      return {
        severity: "warning",
        title: `${name} warmups set to Manual`,
        body: `No finished robot warmup in ${missedDays ?? ROBOT_FAILING_MISSED_DAYS} working days. Back to Automated after one day of hand warmups`,
      };
  }
}

export function restoreCopy(rule: HoldRule, name: string, prevMode: string | null): BellCopy {
  const mode = prevMode === "script" ? "Automated" : "Manual";
  if (rule === "robot_failing") {
    return {
      severity: "success",
      title: `${name} warmups back to Automated`,
      body: "Both warmups were done by hand for a day",
    };
  }
  return {
    severity: "success",
    title: `${name} posting again`,
    body: `${ZERO_VIEWS_HOLD_DAYS} days of hand warmups done. Posting resumed and warmups back to ${mode}`,
  };
}
