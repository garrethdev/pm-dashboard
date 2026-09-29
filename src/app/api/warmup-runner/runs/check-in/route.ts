import { NextResponse } from "next/server";
import { checkIn } from "@/lib/data/warmup-runs";
import { parseRunKey, readBody, requireRunnerToken, runnerFailure } from "@/lib/warmup-runner-api";

/**
 * POST /api/warmup-runner/runs/check-in — operation 4 (PF-13): still running.
 *
 * { accountId, sessionNo, startedAt }, once a minute. The time recorded is the
 * dashboard's own, not the Air's.
 */
export async function POST(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  try {
    const run = await checkIn(parseRunKey(body));
    return NextResponse.json({ ok: true, run });
  } catch (err) {
    return runnerFailure(err);
  }
}
