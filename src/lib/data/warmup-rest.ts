/**
 * Robot warmups paused for the day after a warning (Amine plan R3; Garreth,
 * 2026-11-10).
 *
 * When the warmup robot stops because the app showed the account a warning,
 * the account gets no more robot warmups for the rest of that New York day.
 * The dashboard then:
 *   - leaves it out of the accounts the robot may warm (warmup-runs.ts),
 *   - treats it as Manual for the day, so its warmups are on Yurie's to-do
 *     list and can be ticked (todo.ts), the same as an account switched to
 *     Manual mid-day (Garreth, 2026-09-28),
 *   - says so on the account's page: "Robot warmups paused today: warning".
 *
 * Read from the warmup REPORT, not the session row: a warmup stopped in its
 * first minute writes no session row, but always sends its report. The robot
 * keeps the same rule on its own (warmup-runner guard.ts,
 * REST_FOR_THE_DAY_AFTER), so a report that never arrives still rests the
 * account, and a robot restarted mid-day is still held back here.
 *
 * `accounts.warmup_mode` is never changed: tomorrow the account is Automated
 * again by itself.
 */

import { ACCOUNT_FK_COL, type AccountId } from "@/lib/data/account-id";
import { dayRangeET, sbFetch } from "@/lib/data/warmup-sessions";

/** The report notes that rest an account for the rest of the day. Matches
 *  warmup-runner's REST_FOR_THE_DAY_AFTER (its stop table's notes). */
export const REST_FOR_THE_DAY_NOTES: readonly string[] = ["warning_on_screen"];

/** What the account page shows while an account rests. */
export const RESTING_LABEL = "Robot warmups paused today: warning";

export interface ReportOutcomeRow {
  account_id: AccountId;
  outcome: string;
  note: string | null;
}

/** The accounts these reports rest: a stop whose note is one of
 *  REST_FOR_THE_DAY_NOTES. */
export function restedBy(rows: readonly ReportOutcomeRow[]): Set<AccountId> {
  return new Set(
    rows
      .filter((row) => row.outcome === "stopped" && row.note !== null && REST_FOR_THE_DAY_NOTES.includes(row.note))
      .map((row) => row.account_id),
  );
}

/** The warmup mode an account has for one day's work: Manual on a day it
 *  rests, otherwise its own. */
export function warmupModeForDay(mode: string | null, rests: boolean): string | null {
  return rests && mode === "script" ? "manual" : mode;
}

/**
 * The accounts resting on the New York day `dayOffset` days from today (0 is
 * today), optionally only among `accountIds`. A read that fails rests no one:
 * the robot keeps the rule itself, so the worst case is the account showing
 * as Automated on the dashboard while the robot leaves it alone.
 */
export async function getRestedOnDay(
  dayOffset = 0,
  now: Date = new Date(),
  accountIds?: readonly AccountId[],
): Promise<Set<AccountId>> {
  if (accountIds && accountIds.length === 0) return new Set();
  const { from, to } = dayRangeET(dayOffset, now);
  const notes = REST_FOR_THE_DAY_NOTES.map((note) => `"${note}"`).join(",");
  const only = accountIds ? `&account_id=in.(${accountIds.join(",")})` : "";
  try {
    const res = await sbFetch(
      `warmup_reports?select=${ACCOUNT_FK_COL},outcome,note&outcome=eq.stopped&note=in.(${encodeURIComponent(notes)})` +
        `&started_at=gte.${encodeURIComponent(from.toISOString())}&started_at=lt.${encodeURIComponent(to.toISOString())}${only}`,
      {},
    );
    if (!res.ok) return new Set();
    return restedBy((await res.json()) as ReportOutcomeRow[]);
  } catch {
    return new Set();
  }
}
