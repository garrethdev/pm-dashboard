import { NextResponse } from "next/server";
import { sessionsOnDate, writeScriptSession } from "@/lib/data/warmup-runs";
import {
  parseDeviceId,
  parseInstant,
  parseNote,
  parseRunKey,
  readBody,
  requireRunnerToken,
  runnerFailure,
} from "@/lib/warmup-runner-api";

/**
 * GET /api/warmup-runner/sessions?date=2026-09-28 — operation 2 (PF-13).
 *
 * The warmup sessions already recorded on that New York day for the accounts
 * the script may warm, by hand or by script. Without `date`, today.
 */
export async function GET(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const date =
    new URL(request.url).searchParams.get("date") ??
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  try {
    return NextResponse.json({ date, sessions: await sessionsOnDate(date) });
  } catch (err) {
    return runnerFailure(err);
  }
}

/**
 * POST /api/warmup-runner/sessions — operation 6 (PF-13).
 *
 * The finished session: { accountId, deviceId, sessionNo, startedAt,
 * finishedAt, minutes, note }. `startedAt` is the run's own start, the same
 * instant sent when the run was started. Sending the same session twice is
 * answered `alreadyRecorded: true` and changes nothing.
 */
export async function POST(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  try {
    const key = parseRunKey(body);
    const result = await writeScriptSession({
      ...key,
      deviceId: parseDeviceId(body.deviceId),
      finishedAt: parseInstant(body.finishedAt, "finishedAt"),
      minutes: body.minutes as number,
      note: parseNote(body.note),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return runnerFailure(err);
  }
}
