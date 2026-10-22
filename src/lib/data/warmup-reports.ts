/**
 * The warmup robot's report on each warmup (Garreth, 2026-10-09).
 *
 * The first live scheduled warmup stopped after a minute with `device_lost`,
 * and nobody could see why without fetching a log file off the MacBook Air. So
 * after every warmup that reached the phone, finished or stopped, the robot
 * (garrethdev/warmup-runner) sends one report through operation 7,
 * `POST /api/warmup-runner/reports`: the counts, how it ended, its whole diary
 * (its own JSON log lines) and the screen when it stopped.
 *
 * The account's page lists them like Geelark's task history, and a row opens
 * the diary, fetched only then: a diary can be a megabyte and a screenshot
 * three, so the list never reads either.
 *
 * Kept: the summary for good; the diary and the screenshot for 30 days,
 * cleared whenever a new report arrives (no scheduled job).
 */

import { ACCOUNT_FK_COL, ACCOUNT_ID_COL, type AccountId } from "@/lib/data/account-id";
import { sbFetch } from "@/lib/data/warmup-sessions";
import { RunnerError, type RunKey } from "@/lib/data/warmup-runs";

/** The diary's limit, in characters (the warmup-runner contract). */
export const REPORT_LOG_MAX_CHARS = 1_000_000;
/** The stop screenshot's limit, in base64 characters: about 2.2 MB of PNG. */
export const REPORT_SCREENSHOT_MAX_CHARS = 3_000_000;
/** How long the diary and the screenshot are kept. The summary stays. */
export const REPORT_DIARY_KEEP_DAYS = 30;

/** The counts, under the names the robot sends them. */
export const REPORT_COUNT_KEYS = [
  "videos",
  "posts",
  "claudeChecks",
  "onTopic",
  "likes",
  "saves",
  "follows",
] as const;

export type ReportCounts = Record<(typeof REPORT_COUNT_KEYS)[number], number>;

export type ReportOutcome = "finished" | "stopped";

export interface WarmupReportInput extends RunKey {
  deviceId: string;
  endedAt: string;
  outcome: ReportOutcome;
  note: string | null;
  minutes: number;
  counts: ReportCounts;
  log: string | null;
  screenshot: string | null;
}

/** One row of the list: everything but the diary and the screenshot. */
export interface WarmupReport {
  /** Text, like the answer the robot gets. */
  id: string;
  accountId: AccountId;
  deviceId: string;
  sessionNo: number;
  startedAt: string;
  endedAt: string;
  outcome: ReportOutcome;
  note: string | null;
  minutes: number;
  counts: ReportCounts;
  hasLog: boolean;
  hasScreenshot: boolean;
  /** When the 30-day clear-out emptied the diary; null while it is kept. */
  clearedAt: string | null;
}

/** One report opened: the row, who and where, and the diary itself. */
export interface WarmupReportDiary extends WarmupReport {
  username: string | null;
  profile: string | null;
  deviceName: string | null;
  log: string | null;
}

interface RawReport {
  id: string;
  account_id: AccountId;
  device_id: string;
  session_no: number;
  started_at: string;
  ended_at: string;
  outcome: ReportOutcome;
  note: string | null;
  minutes: number;
  videos: number;
  posts: number;
  claude_checks: number;
  on_topic: number;
  likes: number;
  saves: number;
  follows: number;
  has_log: boolean;
  has_screenshot: boolean;
  cleared_at: string | null;
}

/** Never `log` or `screenshot`: those are read one report at a time. */
const LIST_COLS =
  `id:id::text,${ACCOUNT_FK_COL},device_id:device_id::text,session_no,started_at,ended_at,` +
  "outcome,note,minutes,videos,posts,claude_checks,on_topic,likes,saves,follows," +
  "has_log,has_screenshot,cleared_at";

function toReport(r: RawReport): WarmupReport {
  return {
    id: r.id,
    accountId: r.account_id,
    deviceId: r.device_id,
    sessionNo: r.session_no,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    outcome: r.outcome,
    note: r.note,
    minutes: r.minutes,
    counts: {
      videos: r.videos,
      posts: r.posts,
      claudeChecks: r.claude_checks,
      onTopic: r.on_topic,
      likes: r.likes,
      saves: r.saves,
      follows: r.follows,
    },
    hasLog: r.has_log,
    hasScreenshot: r.has_screenshot,
    clearedAt: r.cleared_at,
  };
}

async function readJson<T>(path: string, what: string): Promise<T> {
  const res = await sbFetch(path, {});
  if (!res.ok) throw new Error(`Couldn't read ${what} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

function keyFilter(key: RunKey): string {
  return (
    `account_id=eq.${key.accountId}&session_no=eq.${key.sessionNo}` +
    `&started_at=eq.${encodeURIComponent(key.startedAt)}`
  );
}

function pgCode(text: string): string | undefined {
  try {
    return (JSON.parse(text) as { code?: string }).code;
  } catch {
    return undefined;
  }
}

/**
 * Empty the diary and the screenshot of every report whose warmup started
 * more than 30 days ago. The summary stays. Run after each new report rather
 * than on a schedule; a failure here is logged and never refuses the report
 * that triggered it, because the report itself has already landed.
 */
export async function clearOldDiaries(now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - REPORT_DIARY_KEEP_DAYS * 86_400_000).toISOString();
  try {
    const res = await sbFetch(
      `warmup_reports?started_at=lt.${encodeURIComponent(cutoff)}` +
        "&or=(has_log.is.true,has_screenshot.is.true)",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ log: null, screenshot: null, cleared_at: now.toISOString() }),
      },
    );
    if (!res.ok) {
      console.error(`clearing old warmup diaries rejected (HTTP ${res.status}):`, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("clearing old warmup diaries failed:", err);
  }
}

/**
 * Operation 7: store a warmup's report.
 *
 * Accepted for any account and phone that exist, Automated or not: a report
 * is history, and the account may have been flipped to Manual mid-warmup.
 * Sending the same report twice (a retry after a timeout) is caught by the
 * one-per-start rule and answered `alreadyReported: true` with the first
 * report's id; nothing changes.
 */
export async function writeReport(
  input: WarmupReportInput,
  now: Date = new Date(),
): Promise<{ id: string | null; alreadyReported: boolean }> {
  const res = await sbFetch(
    "warmup_reports?select=id:id::text",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        account_id: input.accountId,
        device_id: input.deviceId,
        session_no: input.sessionNo,
        started_at: input.startedAt,
        ended_at: input.endedAt,
        outcome: input.outcome,
        note: input.note,
        minutes: input.minutes,
        videos: input.counts.videos,
        posts: input.counts.posts,
        claude_checks: input.counts.claudeChecks,
        on_topic: input.counts.onTopic,
        likes: input.counts.likes,
        saves: input.counts.saves,
        follows: input.counts.follows,
        log: input.log,
        screenshot: input.screenshot,
      }),
    },
    // No blind retry: the one-per-start rule makes a repeat harmless, but the
    // robot is the one that decides to try again.
    0,
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const code = pgCode(text);
    // warmup_reports_one_per_start: this warmup's report is already here.
    if (code === "23505") {
      const rows = await readJson<{ id: string }[]>(
        `warmup_reports?select=id:id::text&${keyFilter(input)}`,
        "the report already sent",
      ).catch(() => []);
      return { id: rows[0]?.id ?? null, alreadyReported: true };
    }
    if (code === "23503") {
      throw new RunnerError("That account or phone does not exist.", 409, "not_found");
    }
    console.error(`writing a warmup report rejected (HTTP ${res.status}):`, text.slice(0, 2000));
    throw new Error(`Saving the report failed (HTTP ${res.status}). Nothing was changed.`);
  }
  const rows = (await res.json()) as { id: string }[];
  await clearOldDiaries(now);
  return { id: rows[0]?.id ?? null, alreadyReported: false };
}

// --- For the dashboard's own screens -------------------------------------------

/**
 * One account's reports, newest first, by its Profile name — the name the
 * account page is addressed by. Never reads a diary or a screenshot.
 */
export async function getWarmupReportsForProfile(
  profile: string,
  limit = 200,
): Promise<WarmupReport[]> {
  const accounts = await readJson<{ id: AccountId }[]>(
    `accounts?select=${ACCOUNT_ID_COL}&geelark_profile=eq.${encodeURIComponent(profile)}&limit=1`,
    "the account",
  );
  const accountId = accounts[0]?.id;
  if (!accountId) return [];
  const rows = await readJson<RawReport[]>(
    `warmup_reports?select=${LIST_COLS}&account_id=eq.${accountId}&order=started_at.desc&limit=${limit}`,
    "the warmup reports",
  );
  return rows.map(toReport);
}

/** A report id from a URL: a positive whole number, kept as text. */
export function parseReportId(raw: unknown): string | null {
  return typeof raw === "string" && /^[1-9]\d{0,18}$/.test(raw) ? raw : null;
}

/** One report with its diary (not its screenshot), or null when there is none. */
export async function getWarmupReportDiary(id: string): Promise<WarmupReportDiary | null> {
  const rows = await readJson<
    (RawReport & {
      log: string | null;
      account: { username: string | null; geelark_profile: string | null } | null;
      device: { name: string | null } | null;
    })[]
  >(
    `warmup_reports?select=${LIST_COLS},log,` +
      "account:accounts(username,geelark_profile),device:devices(name)" +
      `&id=eq.${id}`,
    "the warmup report",
  );
  const r = rows[0];
  if (!r) return null;
  return {
    ...toReport(r),
    username: r.account?.username ?? null,
    profile: r.account?.geelark_profile ?? null,
    deviceName: r.device?.name ?? null,
    log: r.log,
  };
}

/** One report's stop screenshot as PNG bytes, or null when there is none. */
export async function getWarmupReportScreenshot(id: string): Promise<Uint8Array | null> {
  const rows = await readJson<{ screenshot: string | null }[]>(
    `warmup_reports?select=screenshot&id=eq.${id}`,
    "the screenshot",
  );
  const b64 = rows[0]?.screenshot;
  return b64 ? new Uint8Array(Buffer.from(b64, "base64")) : null;
}
