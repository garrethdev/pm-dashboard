/**
 * Warmup sessions done on a real phone (PF-04).
 *
 * One row of `warmup_sessions` per session logged. On the Geelark fleet the
 * answer to "was this account warmed?" is a `geelark_tasks` row the cloud
 * phone wrote itself. A real iPhone writes nothing, so on the Physical fleet
 * the answer is a row here: put in by a person through the log form (design
 * ticket P3), or later by the warmup script on the Air (PF-13).
 *
 * TWO SESSIONS A DAY, AND THEY ADD UP (Garreth, 2026-09-19). Each account has
 * two sessions a day; a session is done once the minutes logged against it
 * reach 15. Several rows can make one session — ten minutes now, eight more
 * after the phone was put down — so the question "is session 1 done?" is
 * always a SUM over rows, never a single row's minutes. `v_account_warmup_health`
 * does the same sum in SQL, which is what makes the health dot agree with this
 * screen.
 *
 * `warmup_sessions` is service-role only (RLS on, no policies), like `devices`,
 * `accounts` and `post_deliveries`, so everything here runs server-side with
 * the service key.
 *
 * Reads are deliberately NOT cached, for the same reason `post-deliveries.ts`
 * gives: a to-do list is written to while it is being looked at, and a cached
 * copy would show a session somebody has just logged as still outstanding.
 */

import { ACCOUNT_FK_COL, type AccountId } from "@/lib/data/account-id";

/** Who did the warming. Mirrors the check constraint. */
export const WARMUP_MODES = ["manual", "script"] as const;
export type WarmupSessionMode = (typeof WARMUP_MODES)[number];

/**
 * Minutes that make a session done (Garreth, 2026-09-19: a manual session is
 * about 15 to 20 minutes, so 15 is the done line).
 *
 * The same number is written into `v_account_warmup_health`. If it ever moves,
 * it has to move in both, or the health dot and the to-do list will disagree
 * about the same session.
 */
export const SESSION_TARGET_MINUTES = 15;

/** Sessions an account gets each day. */
export const SESSIONS_PER_DAY = 2;

export interface WarmupSession {
  id: number;
  accountId: AccountId;
  /** The phone it was done on. Null when the account is not on one. */
  deviceId: number | null;
  startedAt: string;
  /** When a scripted run ended. Always null for a session logged by hand. */
  finishedAt: string | null;
  minutes: number;
  /** Which of the day's two sessions this counts toward. */
  sessionNo: number;
  mode: WarmupSessionMode;
  note: string | null;
  loggedBy: string | null;
}

interface RawSession {
  id: number;
  account_id: AccountId;
  device_id: number | null;
  started_at: string;
  finished_at: string | null;
  minutes: number;
  session_no: number;
  mode: string;
  note: string | null;
  logged_by: string | null;
}

const COLS =
  `id,${ACCOUNT_FK_COL},device_id,started_at,finished_at,minutes,session_no,mode,note,logged_by`;

function toSession(row: RawSession): WarmupSession {
  return {
    id: row.id,
    accountId: row.account_id,
    deviceId: row.device_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    minutes: row.minutes,
    sessionNo: row.session_no,
    // The column is constrained to these two, so anything else means the
    // constraint was changed without this file; say so rather than drawing a
    // mode nothing knows how to label.
    mode: row.mode === "script" ? "script" : "manual",
    note: row.note,
    loggedBy: row.logged_by,
  };
}

/** An error whose message is already a sentence for the screen, with the HTTP
 *  status the route should answer with. */
export class WarmupWriteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

/** Same shape as the helper in `post-deliveries.ts`: timeout, one retry, and a
 *  sentence rather than a stack trace when Supabase cannot be reached. */
async function sbFetch(path: string, init: RequestInit, retries = 1): Promise<Response> {
  const key = serviceKey();
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: { apikey: key, Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Couldn't reach Supabase (${lastErr instanceof Error ? lastErr.message : "timeout"})`,
  );
}

async function readRows(path: string, what: string): Promise<WarmupSession[]> {
  const res = await sbFetch(path, {});
  if (!res.ok) throw new Error(`Couldn't read ${what} (HTTP ${res.status})`);
  return ((await res.json()) as RawSession[]).map(toSession);
}

/**
 * The start of today in New York, as an ISO instant.
 *
 * Every day boundary in this database is New York's, not the server's and not
 * the viewer's — the scheduler, the digest and `v_account_warmup_health` all
 * count days that way, and a session logged at 9pm ET must belong to that day
 * however the machine reading it is set. The n8n instance's own default is
 * Asia/Manila, twelve hours out, so this is never left to a clock.
 *
 * Built from the calendar date rather than by subtracting hours, so the two
 * days a year the clocks move do not shift the boundary by an hour.
 */
export function startOfDayET(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  // Midnight UTC on that date, then moved by New York's offset at that moment.
  // The offset is read rather than assumed, because it is -05:00 for half the
  // year and -04:00 for the other half.
  const utcMidnight = new Date(`${ymd}T00:00:00Z`);
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "longOffset",
  })
    .formatToParts(utcMidnight)
    .find((p) => p.type === "timeZoneName")?.value; // "GMT-04:00"
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offset ?? "");
  if (!match) return utcMidnight; // Never seen; better a whole day than a crash.
  const minutes =
    (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
  return new Date(utcMidnight.getTime() - minutes * 60_000);
}

/**
 * The New York day `offset` days from today, as the half-open instant range
 * [start, end). The to-do list steps to any day, so every read of a day's work
 * goes through this rather than assuming today.
 */
export function dayRangeET(offset = 0, now: Date = new Date()): { from: Date; to: Date } {
  const today = startOfDayET(now);
  // Move by whole days on the calendar, not by 86,400,000 milliseconds: the
  // two days a year the clocks move are 23 and 25 hours long.
  const shift = (d: Date, days: number) => {
    const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
    const [y, m, day] = ymd.split("-").map(Number);
    // NOON UTC, not midnight: midnight UTC is 7 or 8pm in New York on the day
    // BEFORE, so building the instant that way walked every day back one.
    const moved = new Date(Date.UTC(y!, m! - 1, day! + days, 12));
    return startOfDayET(moved);
  };
  return { from: shift(today, offset), to: shift(today, offset + 1) };
}

/** Sessions logged on one New York day, for an account or a whole phone. */
export function getSessionsOnDay(
  filter: { accountId?: AccountId; deviceId?: number } = {},
  dayOffset = 0,
  now: Date = new Date(),
): Promise<WarmupSession[]> {
  const { from, to } = dayRangeET(dayOffset, now);
  const parts = [
    `select=${COLS}`,
    `started_at=gte.${from.toISOString()}`,
    `started_at=lt.${to.toISOString()}`,
    "order=started_at.asc",
  ];
  if (filter.accountId !== undefined) parts.push(`account_id=eq.${filter.accountId}`);
  if (filter.deviceId !== undefined) parts.push(`device_id=eq.${filter.deviceId}`);
  return readRows(`warmup_sessions?${parts.join("&")}`, "that day's warmups");
}

/** Sessions logged today (New York), for an account or a whole phone. */
export function getSessionsToday(
  filter: { accountId?: AccountId; deviceId?: number } = {},
  now: Date = new Date(),
): Promise<WarmupSession[]> {
  const parts = [
    `select=${COLS}`,
    `started_at=gte.${startOfDayET(now).toISOString()}`,
    "order=started_at.asc",
  ];
  if (filter.accountId !== undefined) parts.push(`account_id=eq.${filter.accountId}`);
  if (filter.deviceId !== undefined) parts.push(`device_id=eq.${filter.deviceId}`);
  return readRows(`warmup_sessions?${parts.join("&")}`, "today's warmups");
}

/**
 * Recent sessions, newest first — the warmup history block on a phone's page
 * and on an account's (design ticket P5).
 */
export function getRecentSessions(
  filter: { accountId?: AccountId; deviceId?: number; limit?: number } = {},
): Promise<WarmupSession[]> {
  const parts = [`select=${COLS}`, "order=started_at.desc"];
  if (filter.accountId !== undefined) parts.push(`account_id=eq.${filter.accountId}`);
  if (filter.deviceId !== undefined) parts.push(`device_id=eq.${filter.deviceId}`);
  parts.push(`limit=${filter.limit ?? 50}`);
  return readRows(`warmup_sessions?${parts.join("&")}`, "the warmup history");
}

export interface SessionProgress {
  sessionNo: number;
  /** Minutes logged against this session so far, across every row. */
  minutes: number;
  /** True once those minutes reach the target. */
  done: boolean;
}

/**
 * How each of today's two sessions stands for one account.
 *
 * This is what the log form shows above its stepper ("the sheet shows the
 * target and what is already logged for that session", design ticket P3) and
 * what decides whether a warmup is still on the to-do list.
 */
export function progressToday(sessions: WarmupSession[]): SessionProgress[] {
  return Array.from({ length: SESSIONS_PER_DAY }, (_, i) => {
    const sessionNo = i + 1;
    const minutes = sessions
      .filter((s) => s.sessionNo === sessionNo)
      .reduce((sum, s) => sum + s.minutes, 0);
    return { sessionNo, minutes, done: minutes >= SESSION_TARGET_MINUTES };
  });
}

/**
 * The session a new log should count toward: the first of the day that is not
 * finished yet.
 *
 * Somebody logging a warmup from a phone's page rather than from the to-do
 * list does not pick a session number — they did a warmup and they are
 * recording it. Falling to the last session when both are done means a third
 * warmup in one day is still recorded rather than refused; it simply adds
 * minutes to a session already past its target.
 */
export function nextSessionNo(sessions: WarmupSession[]): number {
  const open = progressToday(sessions).find((p) => !p.done);
  return open?.sessionNo ?? SESSIONS_PER_DAY;
}

export interface LogSessionInput {
  /** Sent as text; Postgres reads it into the bigint column exactly. */
  accountId: AccountId;
  deviceId?: number | null;
  minutes: number;
  /** Omit and it lands on the first of today's sessions that is not done. */
  sessionNo?: number;
  mode?: WarmupSessionMode;
  note?: string | null;
  /** When a scripted run ended (PF-13). Never set for a session logged by hand. */
  finishedAt?: string | null;
  /** Who logged it. Recorded, never shown — the screens show what happened,
   *  not who did it. */
  loggedBy?: string | null;
}

/**
 * Record a warmup session.
 *
 * The minutes are checked here as well as by the database, so a bad number
 * comes back as a sentence the sheet can show rather than as a 400 with a
 * constraint name in it.
 */
export async function logSession(input: LogSessionInput): Promise<WarmupSession> {
  if (!Number.isInteger(input.minutes) || input.minutes <= 0) {
    throw new WarmupWriteError("Minutes must be a whole number above zero.", 400);
  }
  if (input.minutes > 600) {
    throw new WarmupWriteError("That is more than ten hours — check the minutes.", 400);
  }

  const sessionNo =
    input.sessionNo ?? nextSessionNo(await getSessionsToday({ accountId: input.accountId }));

  const body = {
    account_id: input.accountId,
    device_id: input.deviceId ?? null,
    minutes: input.minutes,
    session_no: sessionNo,
    mode: input.mode ?? "manual",
    note: input.note ?? null,
    finished_at: input.finishedAt ?? null,
    logged_by: input.loggedBy ?? null,
  };

  const res = await sbFetch(
    `warmup_sessions?select=${COLS}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body),
    },
    // No retry on a create. A request that timed out may still have landed,
    // and a retry would log the same warmup twice — which here is not caught
    // by a unique index, because two rows for one session are the ordinary
    // case.
    0,
  );
  if (!res.ok) {
    if (res.status === 409) {
      throw new WarmupWriteError("That account no longer exists.", 409);
    }
    console.error(
      `logging a warmup rejected (HTTP ${res.status}):`,
      await res.text().catch(() => ""),
    );
    throw new Error(`Saving the warmup failed (HTTP ${res.status}). Nothing was changed.`);
  }
  const rows = (await res.json()) as RawSession[];
  if (!rows[0]) throw new Error("Logging the warmup returned nothing.");
  return toSession(rows[0]);
}

/**
 * Undo a logged session — the hold-to-undo on a finished item (design ticket
 * P3). Deletes rather than marking it void: a warmup logged by mistake did not
 * happen, and there is nothing about it worth keeping.
 */
export async function deleteSession(id: number): Promise<void> {
  const res = await sbFetch(`warmup_sessions?id=eq.${id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res.ok) {
    throw new Error(`Undoing the warmup failed (HTTP ${res.status}). Nothing was changed.`);
  }
}
