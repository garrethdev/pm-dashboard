import { NextResponse } from "next/server";
import { announceSession } from "@/lib/data/phone-sessions";
import { MAX_FRAMES_PER_SESSION } from "@/lib/data/phone-session-rules";
import { RunnerError } from "@/lib/data/warmup-runs";
import { parseDeviceId, parseInstant, readBody, requireRunnerToken, runnerFailure } from "@/lib/warmup-runner-api";

/**
 * POST /api/warmup-runner/recordings — operation 8 (PF-26): a recorded
 * session is on its way.
 *
 * { deviceId, startedAt, endedAt, expectedFrames }. `startedAt` is the first
 * frame's time and names the session with the phone, so sending it twice
 * lands on the same row. Answers { ok, id, status, alreadyStored }; then
 * operation 9 for the upload links and operation 10 to confirm.
 */
export async function POST(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  try {
    const deviceId = Number(parseDeviceId(body.deviceId));
    const startedAt = parseInstant(body.startedAt, "startedAt");
    const endedAt = parseInstant(body.endedAt, "endedAt");
    if (Date.parse(endedAt) < Date.parse(startedAt)) {
      throw new RunnerError("A session cannot end before it started.", 400, "invalid_body");
    }
    if (Date.parse(startedAt) > Date.now() + 5 * 60_000) {
      throw new RunnerError("startedAt is in the future. Check the Air's clock.", 400, "invalid_body");
    }
    const expected = body.expectedFrames;
    if (typeof expected !== "number" || !Number.isInteger(expected) || expected < 1 || expected > MAX_FRAMES_PER_SESSION) {
      throw new RunnerError(`expectedFrames must be a whole number from 1 to ${MAX_FRAMES_PER_SESSION}.`, 400, "invalid_body");
    }
    const result = await announceSession({ deviceId, startedAt, endedAt, expectedFrames: expected });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return runnerFailure(err);
  }
}
