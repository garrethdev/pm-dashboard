/**
 * Is the warmup script running a session, or has it stopped? (PF-13)
 *
 * Pure, so the list and its tests read the same rule. The data comes from
 * `warmup_runs`: the script starts a run, checks in once a minute, and closes
 * it when the session ends, however it ended.
 */

/**
 * How long a run may go without a check-in before the dashboard calls it
 * stopped.
 *
 * The script checks in once a minute (warmup-runner HANDOVER section 11), so
 * three minutes is two missed check-ins in a row: long enough that one slow
 * request or a Wi-Fi blip on the Air does not flash a false Stopped, short
 * enough that a dead script shows within a few minutes. PF-13's call, and the
 * one number to change if it proves too twitchy or too slow.
 */
export const RUN_QUIET_AFTER_MS = 3 * 60_000;

export interface RunRow {
  account_id: string;
  session_no: number;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
}

export type RunState =
  | { state: "running"; startedAt: string }
  | { state: "stopped"; lastSeenAt: string };

/**
 * What one of the day's two warmups should say about the script.
 *
 * Only the LATEST run for that account and session counts: a run that died,
 * followed by a fresh one, is running again.
 *
 * - Open and heard from recently: Running.
 * - Open but quiet: Stopped. The script died, or the Air lost power or its
 *   connection, without closing the run. This is the silent failure the whole
 *   status exists to make loud.
 * - Closed: nothing. The script ended it on purpose and wrote whatever minutes
 *   it had; the item already shows them.
 * - A session that is already done says nothing either, whatever its runs
 *   did: the minutes are in, and that is the thing that matters.
 */
export function runStateFor(
  runs: RunRow[],
  accountId: string,
  sessionNo: number,
  done: boolean,
  now: Date,
): RunState | null {
  if (done) return null;
  const latest = runs
    .filter((r) => r.account_id === accountId && r.session_no === sessionNo)
    .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))
    .at(-1);
  if (!latest || latest.ended_at) return null;
  const quietFor = now.getTime() - Date.parse(latest.last_seen_at);
  return quietFor <= RUN_QUIET_AFTER_MS
    ? { state: "running", startedAt: latest.started_at }
    : { state: "stopped", lastSeenAt: latest.last_seen_at };
}

/**
 * Days without a finished warmup before an Automated account is a problem
 * (Garreth, 2026-09-28: "3 days no warmup = problem").
 *
 * Automated accounts are the ones nobody on the phones is asked to warm, so a
 * script that has quietly stopped leaves them unwarmed with nobody noticing.
 * This is the line past which the account's own page and its phone's page
 * say so in red.
 */
export const AUTOMATED_WARMUP_OVERDUE_DAYS = 3;

function etDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

/**
 * How many New York days an Automated account has gone without a finished
 * warmup, once that reaches the limit; otherwise null.
 *
 * Counted from the last FINISHED warmup (a session that reached 15 minutes,
 * by hand, by the script, or by Geelark before the move). An account never
 * warmed at all is counted from the day it moved onto its phone, and one with
 * neither date says nothing: there is no day to count from.
 */
export function warmupOverdueDays(
  lastFinishedAt: string | null,
  movedToDeviceAt: string | null,
  now: Date,
): number | null {
  const from = lastFinishedAt ?? movedToDeviceAt;
  if (!from) return null;
  const [a, b] = [etDate(new Date(from)), etDate(now)].map((ymd) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return Date.UTC(y!, m! - 1, d!);
  });
  const days = Math.round((b! - a!) / 86_400_000);
  return days >= AUTOMATED_WARMUP_OVERDUE_DAYS ? days : null;
}
