import { NextResponse } from "next/server";
import { recordPlugEvent } from "@/lib/data/phone-sessions";
import { RunnerError } from "@/lib/data/warmup-runs";
import { parseDeviceId, parseInstant, readBody, requireRunnerToken, runnerFailure } from "@/lib/warmup-runner-api";

/**
 * POST /api/warmup-runner/plug-events — operation 11 (PF-26): a phone was
 * plugged into the Air, and later unplugged.
 *
 * { deviceId, pluggedInAt, unpluggedAt }. Send it once when the phone
 * appears with `unpluggedAt` null, and again with the same `pluggedInAt` and
 * `unpluggedAt` filled when it goes. Written every day whether or not frames
 * were kept: it is what tells "not plugged in" from "the recorder failed".
 */
export async function POST(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  try {
    const deviceId = Number(parseDeviceId(body.deviceId));
    const pluggedInAt = parseInstant(body.pluggedInAt, "pluggedInAt");
    const unpluggedAt =
      body.unpluggedAt === null || body.unpluggedAt === undefined ? null : parseInstant(body.unpluggedAt, "unpluggedAt");
    if (unpluggedAt !== null && Date.parse(unpluggedAt) < Date.parse(pluggedInAt)) {
      throw new RunnerError("A phone cannot be unplugged before it was plugged in.", 400, "invalid_body");
    }
    const result = await recordPlugEvent({ deviceId, pluggedInAt, unpluggedAt });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return runnerFailure(err);
  }
}
