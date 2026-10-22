/**
 * How a warmup report reads on the account page (Garreth, 2026-10-09): the
 * counts line, the diary's lines, and the text "Copy for Claude" and
 * "Download" hand over. Kept apart from the component so it can be tested.
 */

import type { ReportCounts, WarmupReport, WarmupReportDiary } from "@/lib/data/warmup-reports";

/** "videos 128 · Claude 12 (5 on topic) · likes 1 · saves 1 · follows 0".
 *  Photo posts only appear when there were some. */
export function countsLine(c: ReportCounts): string {
  return [
    `videos ${c.videos}`,
    ...(c.posts > 0 ? [`posts ${c.posts}`] : []),
    `Claude ${c.claudeChecks} (${c.onTopic} on topic)`,
    `likes ${c.likes}`,
    `saves ${c.saves}`,
    `follows ${c.follows}`,
  ].join(" · ");
}

/** "Finished" or "Stopped", as the status pill reads. */
export function outcomeLabel(r: Pick<WarmupReport, "outcome">): string {
  return r.outcome === "finished" ? "Finished" : "Stopped";
}

/** "14:05:09", New York time. */
export function etClock(at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

/** "Oct 9, 2026 12:41:10 ET". */
export function etFull(iso: string): string {
  const at = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(at);
  return `${day} ${etClock(at)} ET`;
}

/** "2026-10-09", the New York calendar date. */
function etYmd(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));
}

/** pino's level numbers, in the words the diary uses. */
export type DiaryLevel = "debug" | "info" | "WARNING" | "PROBLEM";

export function levelWord(level: unknown): DiaryLevel {
  if (typeof level !== "number") return "info";
  if (level >= 50) return "PROBLEM";
  if (level >= 40) return "WARNING";
  if (level >= 30) return "info";
  return "debug";
}

export interface DiaryLine {
  /** "HH:MM:SS", New York; null when the line has no readable time. */
  time: string | null;
  level: DiaryLevel;
  msg: string;
  /** The line's other fields, as `key=value`, for context. */
  extra: string;
}

/** Fields every pino line carries that say nothing about the warmup. */
const QUIET_KEYS = new Set(["level", "time", "msg", "pid", "hostname", "v"]);

function shown(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** The diary, one entry per line. A line that is not JSON is shown as it is. */
export function diaryLines(log: string): DiaryLine[] {
  const out: DiaryLine[] = [];
  for (const raw of log.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let obj: Record<string, unknown> | null = null;
    try {
      const parsed: unknown = JSON.parse(line);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        obj = parsed as Record<string, unknown>;
      }
    } catch {
      obj = null;
    }
    if (!obj) {
      out.push({ time: null, level: "info", msg: line, extra: "" });
      continue;
    }
    // pino writes epoch milliseconds by default, an ISO string when told to.
    const t = typeof obj.time === "number" || typeof obj.time === "string" ? new Date(obj.time) : null;
    out.push({
      time: t && !Number.isNaN(t.getTime()) ? etClock(t) : null,
      level: levelWord(obj.level),
      msg: typeof obj.msg === "string" ? obj.msg : "",
      extra: Object.entries(obj)
        .filter(([k]) => !QUIET_KEYS.has(k))
        .map(([k, v]) => `${k}=${shown(v)}`)
        .join(" "),
    });
  }
  return out;
}

/**
 * What "Copy for Claude" copies and "Download" saves: a short header saying
 * which warmup this is, then the robot's raw JSON lines, untouched.
 */
export function claudeText(r: WarmupReportDiary): string {
  const handle = r.username ? `@${r.username}` : "(no username)";
  const header = [
    "Warmup robot report (Peptide Miracles dashboard)",
    `Account: ${handle}, ${r.profile ?? "no profile"}, account id ${r.accountId}`,
    `Phone: ${r.deviceName ?? "unknown"} (id ${r.deviceId})`,
    `Warmup: ${r.sessionNo} of the day`,
    `Started: ${etFull(r.startedAt)}`,
    `Ended: ${etFull(r.endedAt)}`,
    `Outcome: ${r.outcome}${r.note ? ` (${r.note})` : ""}`,
    `Minutes: ${r.minutes}`,
    `Counts: ${countsLine(r.counts)}`,
    `Stop screenshot: ${r.hasScreenshot ? "yes, on the dashboard (not included here)" : "none"}`,
  ];
  const body = r.log
    ? r.log.replace(/\n+$/, "")
    : r.clearedAt
      ? "(The diary was cleared after 30 days.)"
      : "(No diary was sent with this warmup.)";
  return `${header.join("\n")}\n\nDiary (the robot's JSON log lines):\n${body}\n`;
}

/** "warmup-maya_journey8-2026-10-09-w2.log". */
export function diaryFileName(r: WarmupReportDiary): string {
  const who = (r.username ?? r.profile ?? `account-${r.accountId}`).replace(/[^A-Za-z0-9._-]+/g, "-");
  return `warmup-${who}-${etYmd(r.startedAt)}-w${r.sessionNo}.log`;
}
