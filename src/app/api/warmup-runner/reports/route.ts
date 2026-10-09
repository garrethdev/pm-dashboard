import { NextResponse } from "next/server";
import { writeReport } from "@/lib/data/warmup-reports";
import { parseReport, readBody, requireRunnerToken, runnerFailure } from "@/lib/warmup-runner-api";

/**
 * POST /api/warmup-runner/reports — operation 7 (Garreth, 2026-10-09): the
 * warmup's report.
 *
 * { accountId, deviceId, sessionNo, startedAt, endedAt, outcome, note,
 * minutes, counts, log, screenshot }. Sent once after every warmup that
 * reached the phone, finished or stopped, including a stop before Running.
 * Sending the same report twice is answered `alreadyReported: true` and
 * changes nothing.
 */
export async function POST(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  try {
    const result = await writeReport(parseReport(body));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return runnerFailure(err);
  }
}
