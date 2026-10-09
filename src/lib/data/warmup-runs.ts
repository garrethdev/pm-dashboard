/**
 * The warmup script's side of the database (PF-13).
 *
 * The script on the MacBook Air (garrethdev/warmup-runner) cannot read or
 * write these tables itself: `accounts`, `devices` and `warmup_sessions` are
 * service-role only, and Garreth chose (2026-09-27) to give the Air a token
 * for a handful of web addresses rather than the master key. Those addresses
 * are the routes under `/api/warmup-runner/`; this file is everything they do.
 *
 * Six operations and nothing else (warmup-runner docs/DASHBOARD-CONNECTION.md):
 * list the eligible accounts, read a day's sessions, start a run, check in,
 * close a run, and write a finished session. The script never changes an
 * account, a phone or a post. A seventh, the warmup's report (Garreth,
 * 2026-10-09), lives in `warmup-reports.ts`.
 *
 * Every refusal is a RunnerError with a short code the script can log and a
 * sentence a person can read.
 */

import { ACCOUNT_FK_COL, ACCOUNT_ID_COL, type AccountId } from "@/lib/data/account-id";
import { sbFetch, startOfDayET, dayRangeET } from "@/lib/data/warmup-sessions";
import { warmupOverdueDays, type RunRow } from "@/lib/data/warmup-run-state";

export class RunnerError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

/**
 * The five checks the script runs an account on (warmup-runner HANDOVER
 * section 5): in use, on the Physical fleet, set to Automated, on a phone, and
 * not banned. `posting_paused` is deliberately NOT one of them — an account
 * just moved onto a phone stays paused while it is being warmed. Pausing stops
 * posts, not warmups.
 */
const ELIGIBLE =
  "is_active=eq.true&delivery_mode=eq.manual&warmup_mode=eq.script" +
  "&device_id=not.is.null&banned_at=is.null";

export interface RunnerAccount {
  /** Text, always: nine real ids are too big for a JavaScript number. */
  id: AccountId;
  username: string | null;
  platform: string | null;
  character: string | null;
  /** Text as well, so the script can keep every id a string. */
  deviceId: string;
  /** When it moved onto its phone: the nearest thing to "started warming". */
  movedToDeviceAt: string | null;
}

interface RawAccount {
  id: AccountId;
  username: string | null;
  platform: string | null;
  character: string | null;
  device_id: string;
  moved_to_device_at: string | null;
}

async function readJson<T>(path: string, what: string): Promise<T> {
  const res = await sbFetch(path, {});
  if (!res.ok) throw new Error(`Couldn't read ${what} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

async function readAccounts(extra = ""): Promise<RunnerAccount[]> {
  const rows = await readJson<RawAccount[]>(
    `accounts?select=${ACCOUNT_ID_COL},username,platform,character,` +
      `device_id:device_id::text,moved_to_device_at&${ELIGIBLE}${extra}&order=id.asc`,
    "the accounts",
  );
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    platform: r.platform,
    character: r.character,
    deviceId: r.device_id,
    movedToDeviceAt: r.moved_to_device_at,
  }));
}

/** Operation 1: every account the script may warm today. */
export function eligibleAccounts(): Promise<RunnerAccount[]> {
  return readAccounts();
}

async function eligibleAccount(accountId: AccountId): Promise<RunnerAccount | null> {
  return (await readAccounts(`&id=eq.${accountId}`))[0] ?? null;
}

/** A New York calendar date ("2026-09-28") as the instant range it covers. */
export function rangeOfETDate(ymd: string): { from: Date; to: Date } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  // NOON UTC on the date is the same calendar date in New York (7 or 8am), so
  // startOfDayET lands on that date's midnight — the same trick dayRangeET uses.
  const noon = new Date(Date.UTC(y, mo - 1, d, 12));
  if (noon.getUTCFullYear() !== y || noon.getUTCMonth() !== mo - 1 || noon.getUTCDate() !== d) {
    return null; // 2026-02-30 and the like.
  }
  return {
    from: startOfDayET(noon),
    to: startOfDayET(new Date(Date.UTC(y, mo - 1, d + 1, 12))),
  };
}

export interface RunnerSession {
  accountId: AccountId;
  sessionNo: number;
  minutes: number;
  mode: string;
  startedAt: string;
}

/**
 * Operation 2: the sessions already recorded on one New York day, for the
 * eligible accounts. By hand or by the script — both count, so a restart
 * never runs an account twice and never gives it a third session.
 */
export async function sessionsOnDate(ymd: string): Promise<RunnerSession[]> {
  const range = rangeOfETDate(ymd);
  if (!range) throw new RunnerError("The date must be written 2026-09-28.", 400, "invalid_date");
  const ids = (await eligibleAccounts()).map((a) => a.id);
  if (ids.length === 0) return [];
  const rows = await readJson<
    { account_id: AccountId; session_no: number; minutes: number; mode: string; started_at: string }[]
  >(
    `warmup_sessions?select=${ACCOUNT_FK_COL},session_no,minutes,mode,started_at` +
      `&started_at=gte.${range.from.toISOString()}&started_at=lt.${range.to.toISOString()}` +
      `&account_id=in.(${ids.join(",")})&order=started_at.asc`,
    "that day's sessions",
  );
  return rows.map((r) => ({
    accountId: r.account_id,
    sessionNo: r.session_no,
    minutes: r.minutes,
    mode: r.mode,
    startedAt: r.started_at,
  }));
}

// --- Runs ---------------------------------------------------------------------

/** How the script names a run: it never holds a row id. */
export interface RunKey {
  accountId: AccountId;
  sessionNo: 1 | 2;
  /** Normalised to `toISOString()` by the route, so it matches exactly. */
  startedAt: string;
}

export interface Run {
  id: number;
  accountId: AccountId;
  deviceId: string;
  sessionNo: number;
  startedAt: string;
  lastSeenAt: string;
  endedAt: string | null;
  note: string | null;
}

interface RawRun {
  id: number;
  account_id: AccountId;
  device_id: string;
  session_no: number;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
  note: string | null;
}

const RUN_COLS =
  `id,${ACCOUNT_FK_COL},device_id:device_id::text,session_no,started_at,last_seen_at,ended_at,note`;

function toRun(r: RawRun): Run {
  return {
    id: r.id,
    accountId: r.account_id,
    deviceId: r.device_id,
    sessionNo: r.session_no,
    startedAt: r.started_at,
    lastSeenAt: r.last_seen_at,
    endedAt: r.ended_at,
    note: r.note,
  };
}

function keyFilter(key: RunKey): string {
  return (
    `account_id=eq.${key.accountId}&session_no=eq.${key.sessionNo}` +
    `&started_at=eq.${encodeURIComponent(key.startedAt)}`
  );
}

async function findRun(key: RunKey): Promise<Run | null> {
  const rows = await readJson<RawRun[]>(`warmup_runs?select=${RUN_COLS}&${keyFilter(key)}`, "the run");
  return rows[0] ? toRun(rows[0]) : null;
}

const NOT_ELIGIBLE = new RunnerError(
  "This account is not set to Automated on a phone, or it is retired or banned.",
  409,
  "not_eligible",
);

function wrongPhone(expected: string): RunnerError {
  return new RunnerError(`This account is on phone ${expected}, not the one named.`, 409, "wrong_phone");
}

/**
 * Operation 3: say a run has started. Refused unless the account passes the
 * five checks and is on the phone named. Starting the same run twice (a retry)
 * returns the run already there rather than making a second.
 */
export async function startRun(key: RunKey, deviceId: string): Promise<Run> {
  const account = await eligibleAccount(key.accountId);
  if (!account) throw NOT_ELIGIBLE;
  if (account.deviceId !== deviceId) throw wrongPhone(account.deviceId);

  const res = await sbFetch(
    `warmup_runs?on_conflict=account_id,session_no,started_at`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        account_id: key.accountId,
        device_id: deviceId,
        session_no: key.sessionNo,
        started_at: key.startedAt,
        last_seen_at: new Date().toISOString(),
      }),
    },
    0,
  );
  if (!res.ok) {
    console.error(`starting a warmup run rejected (HTTP ${res.status}):`, await res.text().catch(() => ""));
    throw new Error(`Starting the run failed (HTTP ${res.status}).`);
  }
  const run = await findRun(key);
  if (!run) throw new Error("Starting the run returned nothing.");
  return run;
}

async function patchOpenRun(key: RunKey, body: Record<string, unknown>): Promise<Run | null> {
  const res = await sbFetch(
    `warmup_runs?${keyFilter(key)}&ended_at=is.null&select=${RUN_COLS}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    console.error(`updating a warmup run rejected (HTTP ${res.status}):`, await res.text().catch(() => ""));
    throw new Error(`Updating the run failed (HTTP ${res.status}).`);
  }
  const rows = (await res.json()) as RawRun[];
  return rows[0] ? toRun(rows[0]) : null;
}

const RUN_NOT_FOUND = new RunnerError(
  "No run was started for this account, session and start time.",
  404,
  "run_not_found",
);

/** Operation 4: the once-a-minute "still running". */
export async function checkIn(key: RunKey): Promise<Run> {
  const run = await patchOpenRun(key, { last_seen_at: new Date().toISOString() });
  if (run) return run;
  if (await findRun(key)) {
    throw new RunnerError("This run has already been closed.", 409, "run_closed");
  }
  throw RUN_NOT_FOUND;
}

/**
 * Operation 5: close a run, finished or stopped. Closing a run that is already
 * closed (a retry) is not an error; the first close stands.
 */
export async function closeRun(
  key: RunKey,
  endedAt: string,
  note: string | null,
): Promise<{ run: Run; alreadyClosed: boolean }> {
  if (Date.parse(endedAt) < Date.parse(key.startedAt)) {
    throw new RunnerError("A run cannot end before it started.", 400, "invalid_body");
  }
  const run = await patchOpenRun(key, {
    ended_at: endedAt,
    note,
    last_seen_at: new Date().toISOString(),
  });
  if (run) return { run, alreadyClosed: false };
  const existing = await findRun(key);
  if (existing) return { run: existing, alreadyClosed: true };
  throw RUN_NOT_FOUND;
}

export interface ScriptSessionInput extends RunKey {
  deviceId: string;
  finishedAt: string;
  minutes: number;
  note: string | null;
}

/**
 * Operation 6: the finished session, the dashboard's proof the account was
 * warmed. Always `mode = 'script'` and `logged_by = 'warmup-runner'`, set here
 * rather than trusted from the request.
 *
 * Accepted when the account passes the five checks now, OR when a run was
 * started for it: the script writes the row before it closes the run, and an
 * account flipped back to Manual halfway through was still warmed for the
 * minutes it ran. Writing the same run twice (a retry after a timeout) is
 * caught by the database's one-row-per-run index and answered as already
 * recorded, so it can never count twice.
 */
export async function writeScriptSession(
  input: ScriptSessionInput,
): Promise<{ id: number | null; alreadyRecorded: boolean }> {
  const [run, account] = await Promise.all([findRun(input), eligibleAccount(input.accountId)]);
  if (!run && !account) throw NOT_ELIGIBLE;
  const phone = run?.deviceId ?? account!.deviceId;
  if (phone !== input.deviceId) throw wrongPhone(phone);

  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 600) {
    throw new RunnerError("Minutes must be a whole number from 1 to 600.", 400, "invalid_minutes");
  }
  const elapsed = (Date.parse(input.finishedAt) - Date.parse(input.startedAt)) / 60_000;
  if (elapsed < 0) {
    throw new RunnerError("A session cannot finish before it started.", 400, "invalid_body");
  }
  // One minute of slack for rounding. More minutes than the clock allows is a
  // bug in the script, and would mark a short session done.
  if (input.minutes > Math.ceil(elapsed) + 1) {
    throw new RunnerError(
      "More minutes than passed between the start and the finish.",
      400,
      "invalid_minutes",
    );
  }

  const res = await sbFetch(
    "warmup_sessions?select=id",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        account_id: input.accountId,
        device_id: input.deviceId,
        started_at: input.startedAt,
        finished_at: input.finishedAt,
        minutes: input.minutes,
        session_no: input.sessionNo,
        mode: "script",
        note: input.note,
        logged_by: "warmup-runner",
      }),
    },
    // No blind retry: the index below makes a repeat harmless, but the script
    // is the one that decides to try again.
    0,
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const code = (() => {
      try {
        return (JSON.parse(text) as { code?: string }).code;
      } catch {
        return undefined;
      }
    })();
    // warmup_sessions_script_once: this run's row is already there.
    if (code === "23505") return { id: null, alreadyRecorded: true };
    if (code === "23503") {
      throw new RunnerError("That account or phone no longer exists.", 409, "not_found");
    }
    console.error(`writing a scripted warmup rejected (HTTP ${res.status}):`, text);
    throw new Error(`Saving the session failed (HTTP ${res.status}). Nothing was changed.`);
  }
  const rows = (await res.json()) as { id: number }[];
  return { id: rows[0]?.id ?? null, alreadyRecorded: false };
}

// --- For the dashboard's own screens -------------------------------------------

/** Every run started on one New York day, for the Running mark — all
 *  accounts, or one. */
export async function getRunsOnDay(
  dayOffset = 0,
  now: Date = new Date(),
  only: { accountId?: AccountId } = {},
): Promise<RunRow[]> {
  const { from, to } = dayRangeET(dayOffset, now);
  return readJson<RunRow[]>(
    `warmup_runs?select=${ACCOUNT_FK_COL},session_no,started_at,last_seen_at,ended_at` +
      `&started_at=gte.${from.toISOString()}&started_at=lt.${to.toISOString()}` +
      (only.accountId !== undefined ? `&account_id=eq.${only.accountId}` : "") +
      "&order=started_at.asc",
    "the script's runs",
  );
}

/**
 * The last FINISHED warmup of each account, by its Profile name.
 *
 * Read from `v_account_warmup_health.last_success_at`, the same number the
 * Accounts page's Warmup column and the health dot read, so the 3-day warning
 * can never disagree with them. It already counts the script's sessions,
 * sessions logged by hand, and Geelark's warmups from before a move.
 */
export async function getLastFinishedWarmups(profiles: string[]): Promise<Map<string, string | null>> {
  if (profiles.length === 0) return new Map();
  const list = profiles.map((p) => `"${p.replace(/"/g, '""')}"`).join(",");
  const rows = await readJson<{ geelark_profile: string; last_success_at: string | null }[]>(
    `v_account_warmup_health?select=geelark_profile,last_success_at` +
      `&geelark_profile=in.(${encodeURIComponent(list)})`,
    "when each account was last warmed",
  );
  return new Map(rows.map((r) => [r.geelark_profile, r.last_success_at]));
}

export interface OverdueAccount {
  id: AccountId;
  username: string | null;
  profile: string | null;
  /** New York days without a finished warmup, 3 or more. */
  days: number;
  /** What the count runs from: the last finished warmup, or the move onto
   *  the phone for an account never warmed. Names the streak, so a dismissed
   *  alert comes back if the account recovers and later falls behind again. */
  since: string;
}

interface RawOverdueAccount {
  id: AccountId;
  username: string | null;
  geelark_profile: string | null;
  moved_to_device_at: string | null;
}

async function overdueOf(accounts: RawOverdueAccount[], now: Date): Promise<OverdueAccount[]> {
  const last = await getLastFinishedWarmups(
    accounts.map((a) => a.geelark_profile).filter((p): p is string => Boolean(p)),
  );
  const out: OverdueAccount[] = [];
  for (const a of accounts) {
    const finished = (a.geelark_profile ? last.get(a.geelark_profile) : null) ?? null;
    const days = warmupOverdueDays(finished, a.moved_to_device_at, now);
    const since = finished ?? a.moved_to_device_at;
    if (days !== null && since) {
      out.push({ id: a.id, username: a.username, profile: a.geelark_profile, days, since });
    }
  }
  return out;
}

const OVERDUE_COLS = `${ACCOUNT_ID_COL},username,geelark_profile,moved_to_device_at`;

/**
 * Which of these accounts are Automated and past the 3-day line, and by how
 * many days (Garreth, 2026-09-28). Manual accounts are never in the answer:
 * their warmups are on someone's list, which is its own reminder.
 */
export async function getAutomatedOverdue(
  accountIds: AccountId[],
  now: Date = new Date(),
): Promise<Map<AccountId, number>> {
  if (accountIds.length === 0) return new Map();
  const accounts = await readJson<RawOverdueAccount[]>(
    `accounts?select=${OVERDUE_COLS}&warmup_mode=eq.script&id=in.(${accountIds.join(",")})`,
    "the accounts",
  );
  return new Map((await overdueOf(accounts, now)).map((a) => [a.id, a.days]));
}

/**
 * Every account the script is meant to be warming — the same five checks the
 * script itself runs on, paused or not — that is past the 3-day line. For the
 * bell (Garreth, 2026-09-28: "add that as a notification").
 */
export async function getAllAutomatedOverdue(now: Date = new Date()): Promise<OverdueAccount[]> {
  const accounts = await readJson<RawOverdueAccount[]>(
    `accounts?select=${OVERDUE_COLS}&${ELIGIBLE}&order=id.asc`,
    "the accounts",
  );
  return overdueOf(accounts, now);
}
