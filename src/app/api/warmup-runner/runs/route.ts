import { NextResponse } from "next/server";
import { startRun } from "@/lib/data/warmup-runs";
import { parseDeviceId, parseRunKey, readBody, requireRunnerToken, runnerFailure } from "@/lib/warmup-runner-api";

/**
 * POST /api/warmup-runner/runs — operation 3 (PF-13): a run has started.
 *
 * { accountId, deviceId, sessionNo, startedAt }. From here the dashboard shows
 * the warmup as Running for as long as check-ins keep coming. Sending the same
 * start twice returns the run already there.
 */
export async function POST(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  try {
    const run = await startRun(parseRunKey(body), parseDeviceId(body.deviceId));
    return NextResponse.json({ ok: true, run });
  } catch (err) {
    return runnerFailure(err);
  }
}
