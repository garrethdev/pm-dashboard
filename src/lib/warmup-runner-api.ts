import { NextResponse } from "next/server";
import { requireBearerToken } from "@/lib/api-token";
import { parseAccountId } from "@/lib/data/account-id";
import { RunnerError, type RunKey } from "@/lib/data/warmup-runs";
import {
  REPORT_COUNT_KEYS,
  REPORT_LOG_MAX_CHARS,
  REPORT_SCREENSHOT_MAX_CHARS,
  type ReportCounts,
  type WarmupReportInput,
} from "@/lib/data/warmup-reports";

/**
 * The door for the warmup script on the Air (PF-13).
 *
 * Every other /api route is for a signed-in person on the allowlist. The
 * script is not a person and has no session, so these routes are let past the
 * sign-in gate in `proxy.ts` and check a token here instead: the value of
 * WARMUP_RUNNER_TOKEN, sent as `Authorization: Bearer <token>`.
 *
 * Shut when the token is not configured — a missing setting must never mean
 * an open door.
 */
export const RUNNER_API_PREFIX = "/api/warmup-runner/";

export function requireRunnerToken(request: Request): NextResponse | null {
  return requireBearerToken(
    request,
    process.env.WARMUP_RUNNER_TOKEN,
    "The warmup script's access is not set up on the dashboard.",
  );
}

/** A JSON body, or null when there is none or it is not an object. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function invalid(message: string): never {
  throw new RunnerError(message, 400, "invalid_body");
}

/** An instant from the request, normalised so it matches the stored one exactly. */
export function parseInstant(raw: unknown, name: string): string {
  if (typeof raw !== "string") invalid(`${name} is missing.`);
  const t = Date.parse(raw);
  if (Number.isNaN(t)) invalid(`${name} is not a date and time.`);
  return new Date(t).toISOString();
}

/** A phone id, as text. Small numbers are accepted too. */
export function parseDeviceId(raw: unknown): string {
  if (typeof raw === "number" && Number.isSafeInteger(raw) && raw > 0) return String(raw);
  if (typeof raw === "string" && /^[1-9]\d{0,18}$/.test(raw)) return raw;
  invalid("deviceId is missing or not a phone id.");
}

/**
 * The three fields that name a run. The start must be recent: a run that
 * claims to have started days ago, or in the future, is a clock or a bug on
 * the Air, not a warmup.
 */
export function parseRunKey(body: Record<string, unknown>, now = new Date()): RunKey {
  const accountId = parseAccountId(body.accountId);
  if (accountId === null) invalid("accountId is missing, or was sent as a number too big to be exact. Send it as text.");
  if (body.sessionNo !== 1 && body.sessionNo !== 2) invalid("sessionNo must be 1 or 2.");
  const startedAt = parseInstant(body.startedAt, "startedAt");
  const t = Date.parse(startedAt);
  if (t > now.getTime() + 5 * 60_000 || t < now.getTime() - 36 * 3_600_000) {
    invalid("startedAt is more than 36 hours ago or in the future. Check the Air's clock.");
  }
  return { accountId, sessionNo: body.sessionNo, startedAt };
}

/** A note from the script: short text or nothing. */
export function parseNote(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") invalid("note must be text.");
  const note = raw.trim();
  if (note.length > 500) invalid("note is longer than 500 characters.");
  return note || null;
}

function invalidField(message: string): never {
  throw new RunnerError(message, 400, "invalid_field");
}

/** The seven counts of a report, each a whole number from 0. */
function parseCounts(raw: unknown): ReportCounts {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) invalid("counts is missing.");
  const src = raw as Record<string, unknown>;
  const out = {} as ReportCounts;
  for (const key of REPORT_COUNT_KEYS) {
    const n = src[key];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 1_000_000) {
      invalid(`counts.${key} must be a whole number from 0.`);
    }
    out[key] = n;
  }
  return out;
}

/** The diary: the runner's own log lines, as text, or nothing. */
function parseLog(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") invalidField("log must be text.");
  if (raw.length > REPORT_LOG_MAX_CHARS) {
    invalidField(`log is longer than ${REPORT_LOG_MAX_CHARS.toLocaleString("en-US")} characters.`);
  }
  return raw;
}

/** Every PNG starts with the same eight bytes; in base64 they read like this. */
const PNG_BASE64_START = "iVBORw0KGgo";

/** The stop screenshot: a base64 PNG, or nothing. */
function parseScreenshot(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") invalidField("screenshot must be base64 text.");
  if (raw.length > REPORT_SCREENSHOT_MAX_CHARS) {
    invalidField(
      `screenshot is longer than ${REPORT_SCREENSHOT_MAX_CHARS.toLocaleString("en-US")} characters.`,
    );
  }
  if (raw.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    invalidField("screenshot is not base64. Send the PNG's bytes as plain base64, with no data: prefix.");
  }
  if (!raw.startsWith(PNG_BASE64_START)) invalidField("screenshot is not a PNG.");
  return raw;
}

/**
 * Operation 7's body: the warmup's report. Same run key as operations 3 to 6,
 * so the start must be recent; `endedAt` must not be before it.
 */
export function parseReport(body: Record<string, unknown>, now = new Date()): WarmupReportInput {
  const key = parseRunKey(body, now);
  const deviceId = parseDeviceId(body.deviceId);
  const endedAt = parseInstant(body.endedAt, "endedAt");
  const elapsed = (Date.parse(endedAt) - Date.parse(key.startedAt)) / 60_000;
  if (elapsed < 0) invalid("A warmup cannot end before it started.");
  if (body.outcome !== "finished" && body.outcome !== "stopped") {
    invalid('outcome must be "finished" or "stopped".');
  }
  const minutes = body.minutes;
  if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 0 || minutes > 600) {
    throw new RunnerError("Minutes must be a whole number from 0 to 600.", 400, "invalid_minutes");
  }
  // One minute of slack for rounding, as operation 6 allows.
  if (minutes > Math.ceil(elapsed) + 1) {
    throw new RunnerError("More minutes than passed between the start and the end.", 400, "invalid_minutes");
  }
  return {
    ...key,
    deviceId,
    endedAt,
    outcome: body.outcome,
    note: parseNote(body.note),
    minutes,
    counts: parseCounts(body.counts),
    log: parseLog(body.log),
    screenshot: parseScreenshot(body.screenshot),
  };
}

/** Turn anything thrown into the answer the script gets. */
export function runnerFailure(err: unknown): NextResponse {
  if (err instanceof RunnerError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Something went wrong.", code: "upstream" },
    { status: 502 },
  );
}
