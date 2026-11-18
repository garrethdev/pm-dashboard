/**
 * The phone's internet connection is not American (Garreth, 2026-11-18).
 *
 * Before a phone's warmups the warmup robot (garrethdev/warmup-runner) checks
 * which country the phone's internet connection comes from. When it is not
 * the United States, usually because the phone's proxy has dropped, the
 * warmup does not run: the robot sends a report with outcome `stopped` and
 * note `connection_not_us: <country code>` (`connection_not_us: PH`, or
 * `connection_not_us: unknown` when it could not tell), and no session row.
 *
 * The dashboard then:
 *   - shows a warning on the account's open warmups on today's To-do list
 *     (todo.ts), the same way warmup-rest.ts reads its warning rest from the
 *     reports: "Phone's connection is not American (PH) at 2:14 AM: check the
 *     phone's proxy",
 *   - names it "Connection not American" on the Warmups page and leaves it
 *     out of the robot's finish rate, like a disconnected phone
 *     (warmup-overview-rules.ts).
 *
 * The warning is about the account's NEWEST report of the New York day: once
 * a later warmup for that account reports anything else, it is gone.
 */

import { ACCOUNT_FK_COL, type AccountId } from "@/lib/data/account-id";
import { CONNECTION_NOT_US, noteCode } from "@/lib/data/warmup-overview-rules";
import { dayRangeET, sbFetch } from "@/lib/data/warmup-sessions";

/**
 * The country a `connection_not_us` note names ("PH"), "unknown" when it names
 * none, or null when the note is some other stop. The kind is matched on its
 * own: "connection_not_us" and "connection_not_us: PH" are both this stop, a
 * note that only starts with the same letters is not.
 */
export function connectionCountry(note: string | null): string | null {
  if (noteCode(note) !== CONNECTION_NOT_US) return null;
  const at = (note ?? "").indexOf(":");
  const country = at === -1 ? "" : note!.slice(at + 1).trim();
  return country === "" || country.toLowerCase() === "unknown" ? "unknown" : country.toUpperCase();
}

/** "2:14 AM", New York time. */
function nyTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** What the To-do list says on the account's warmups. */
export function connectionWarningLabel(country: string, at: string): string {
  const where = country === "unknown" ? "country unknown" : country;
  return `Phone's connection is not American (${where}) at ${nyTime(at)}: check the phone's proxy`;
}

export interface ConnectionReportRow {
  account_id: AccountId;
  outcome: string;
  note: string | null;
  started_at: string;
  ended_at: string | null;
}

/**
 * The accounts whose newest report among these is a `connection_not_us`
 * stop, each with the warning to show. A later report of any other kind,
 * finished or stopped, clears it.
 */
export function connectionWarnings(rows: readonly ConnectionReportRow[]): Map<AccountId, string> {
  const newest = new Map<AccountId, ConnectionReportRow>();
  for (const row of rows) {
    const seen = newest.get(row.account_id);
    if (!seen || later(row, seen)) newest.set(row.account_id, row);
  }
  const out = new Map<AccountId, string>();
  for (const [accountId, row] of newest) {
    const country = row.outcome === "stopped" ? connectionCountry(row.note) : null;
    if (country) out.set(accountId, connectionWarningLabel(country, row.ended_at ?? row.started_at));
  }
  return out;
}

/** Ordered by when the warmup began, then by when it ended. */
function later(a: ConnectionReportRow, b: ConnectionReportRow): boolean {
  const byStart = Date.parse(a.started_at) - Date.parse(b.started_at);
  if (byStart !== 0) return byStart > 0;
  return Date.parse(a.ended_at ?? a.started_at) > Date.parse(b.ended_at ?? b.started_at);
}

/**
 * The connection warnings for today's New York day, among `accountIds`. A
 * read that fails warns no one: the list still loads, and the stop still
 * shows on the Warmups page.
 */
export async function getConnectionWarningsToday(
  now: Date,
  accountIds: readonly AccountId[],
): Promise<Map<AccountId, string>> {
  if (accountIds.length === 0) return new Map();
  const { from, to } = dayRangeET(0, now);
  try {
    const res = await sbFetch(
      `warmup_reports?select=${ACCOUNT_FK_COL},outcome,note,started_at,ended_at` +
        `&account_id=in.(${accountIds.join(",")})` +
        `&started_at=gte.${encodeURIComponent(from.toISOString())}&started_at=lt.${encodeURIComponent(to.toISOString())}` +
        "&order=started_at.asc",
      {},
    );
    if (!res.ok) return new Map();
    return connectionWarnings((await res.json()) as ConnectionReportRow[]);
  } catch {
    return new Map();
  }
}
