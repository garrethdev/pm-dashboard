/**
 * The Warmups page's arithmetic (Garreth, 2026-10-28), kept pure so the page
 * and its tests read the same rules: which kind of stop a robot note is, which
 * New York day a warmup belongs to, and the page's numbers from the rows.
 */

import type { AccountId } from "@/lib/data/account-id";
import type { WarmupReport } from "@/lib/data/warmup-reports";

/** What a stopped warmup ran into, in the few groups a person acts on. */
export type StopKind =
  | "phone"
  | "wrong_account"
  | "warning"
  | "lost"
  | "popup"
  | "feed"
  | "shut_down"
  | "other";

export const STOP_LABEL: Record<StopKind, string> = {
  phone: "Phone disconnected",
  wrong_account: "Wrong account",
  warning: "Warning on screen",
  lost: "Lost its place",
  popup: "Unexpected pop-up",
  feed: "Feed not loading",
  shut_down: "Robot shut down",
  other: "Other",
};

/**
 * Sort the robot's stop note into a kind.
 *
 * The notes are the robot's own (garrethdev/warmup-runner): a few fixed codes,
 * and `error: <where>: saw <screen>` when it landed on a screen it did not
 * expect. Every "saw", "not found" and "refused to" is the robot losing its
 * place in the app, which is one problem however many screens it shows up on.
 */
export function stopKind(note: string | null): StopKind {
  const n = (note ?? "").trim().toLowerCase();
  if (n === "device_lost") return "phone";
  if (n === "wrong_account") return "wrong_account";
  if (n === "warning_on_screen") return "warning";
  if (n === "feed_not_loading") return "feed";
  if (n === "shut_down") return "shut_down";
  if (n.includes("unexpected dialog")) return "popup";
  if (/\bsaw\b|not found|refused to/.test(n)) return "lost";
  return "other";
}

/** "2026-10-28", the New York calendar date of a moment. */
export function etDay(at: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(at));
}

/** The `count` New York days ending on `today`, oldest first. */
export function lastDays(today: string, count: number): string[] {
  const [y, m, d] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const at = new Date(Date.UTC(y, m - 1, d - (count - 1 - i)));
    return at.toISOString().slice(0, 10);
  });
}

export interface OverviewAccount {
  id: AccountId;
  username: string | null;
  /** The name on the profile. What a Facebook account is shown by, since its
   *  username is often a page number. */
  displayName: string | null;
  profile: string | null;
  platform: string | null;
  deviceName: string | null;
}

export interface OverviewRun {
  accountId: AccountId;
  sessionNo: number;
  startedAt: string;
}

/** A report as the page shows it: the row, plus Claude's one-line answer. */
export interface OverviewReport extends WarmupReport {
  reviewSummary: string | null;
}

export interface NeedsLook {
  account: OverviewAccount;
  /** Its newest warmup, which stopped. */
  latest: OverviewReport;
  kind: StopKind;
  /** Stops in the last seven days, this one included. */
  stopsThisWeek: number;
}

export interface DayBar {
  day: string;
  finished: number;
  stopped: number;
}

/** One square of an account's strip: the day's warmup 1 or 2, if it ran. */
export interface StripCell {
  day: string;
  sessionNo: number;
  report: OverviewReport | null;
  running: boolean;
}

export interface AccountStrip {
  account: OverviewAccount;
  cells: StripCell[];
  finished: number;
  stopped: number;
}

export interface WarmupOverview {
  today: { finished: number; stopped: number; running: number; finishRate: number | null };
  needsLook: NeedsLook[];
  running: (OverviewRun & { account: OverviewAccount })[];
  days: DayBar[];
  reasons: { kind: StopKind; count: number }[];
  strips: AccountStrip[];
}

/** How many days the strips and the bars cover. */
export const OVERVIEW_DAYS = 14;
/** How far back "needs a look" and the stop reasons look. */
export const WEEK_DAYS = 7;

/**
 * The page's numbers from the reports of the last fourteen days, the open
 * runs and the accounts. `accounts` is every account the robot works plus any
 * other that reported in the window; the strips list them all, so an account
 * the robot has not reached yet shows as an empty row rather than not at all.
 */
export function buildOverview(input: {
  reports: OverviewReport[];
  runs: OverviewRun[];
  accounts: OverviewAccount[];
  now: Date;
}): WarmupOverview {
  const today = etDay(input.now);
  const days = lastDays(today, OVERVIEW_DAYS);
  const week = new Set(lastDays(today, WEEK_DAYS));
  const byId = new Map(input.accounts.map((a) => [a.id, a]));
  const accountOf = (id: AccountId): OverviewAccount =>
    byId.get(id) ?? { id, username: null, displayName: null, profile: null, platform: null, deviceName: null };

  const reports = [...input.reports].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const runningKeys = new Set(input.runs.map((r) => `${r.accountId}|${etDay(r.startedAt)}|${r.sessionNo}`));

  const todays = reports.filter((r) => etDay(r.startedAt) === today);
  const weekReports = reports.filter((r) => week.has(etDay(r.startedAt)));
  const weekFinished = weekReports.filter((r) => r.outcome === "finished").length;

  // Needs a look: the account's newest warmup stopped, within the week. One
  // that stopped and then finished has recovered and is left off.
  const newest = new Map<string, OverviewReport>();
  for (const r of reports) if (!newest.has(r.accountId)) newest.set(r.accountId, r);
  const needsLook: NeedsLook[] = [...newest.values()]
    .filter((r) => r.outcome === "stopped" && week.has(etDay(r.startedAt)))
    .map((r) => ({
      account: accountOf(r.accountId),
      latest: r,
      kind: stopKind(r.note),
      stopsThisWeek: weekReports.filter((w) => w.accountId === r.accountId && w.outcome === "stopped")
        .length,
    }))
    .sort((a, b) => b.stopsThisWeek - a.stopsThisWeek || b.latest.startedAt.localeCompare(a.latest.startedAt));

  const reasonCounts = new Map<StopKind, number>();
  for (const r of weekReports) {
    if (r.outcome !== "stopped") continue;
    const k = stopKind(r.note);
    reasonCounts.set(k, (reasonCounts.get(k) ?? 0) + 1);
  }

  const cellReport = new Map<string, OverviewReport>();
  // Newest first, so a warmup retried the same day shows its last attempt.
  for (const r of reports) {
    const key = `${r.accountId}|${etDay(r.startedAt)}|${r.sessionNo}`;
    if (!cellReport.has(key)) cellReport.set(key, r);
  }

  const stripIds = new Set(input.accounts.map((a) => a.id));
  for (const r of reports) stripIds.add(r.accountId);
  const strips: AccountStrip[] = [...stripIds]
    .map((id) => {
      const account = accountOf(id);
      const cells: StripCell[] = days.flatMap((day) =>
        [1, 2].map((sessionNo) => {
          const key = `${id}|${day}|${sessionNo}`;
          return { day, sessionNo, report: cellReport.get(key) ?? null, running: runningKeys.has(key) };
        }),
      );
      const own = reports.filter((r) => r.accountId === id);
      return {
        account,
        cells,
        finished: own.filter((r) => r.outcome === "finished").length,
        stopped: own.filter((r) => r.outcome === "stopped").length,
      };
    })
    // Most stops first: the strip a person should look at sits at the top.
    .sort(
      (a, b) =>
        b.stopped - a.stopped ||
        (a.account.username ?? a.account.profile ?? "").localeCompare(b.account.username ?? b.account.profile ?? ""),
    );

  return {
    today: {
      finished: todays.filter((r) => r.outcome === "finished").length,
      stopped: todays.filter((r) => r.outcome === "stopped").length,
      running: input.runs.length,
      finishRate: weekReports.length ? weekFinished / weekReports.length : null,
    },
    needsLook,
    running: input.runs.map((r) => ({ ...r, account: accountOf(r.accountId) })),
    days: days.map((day) => {
      const own = reports.filter((r) => etDay(r.startedAt) === day);
      return {
        day,
        finished: own.filter((r) => r.outcome === "finished").length,
        stopped: own.filter((r) => r.outcome === "stopped").length,
      };
    }),
    reasons: [...reasonCounts.entries()].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count),
    strips,
  };
}
