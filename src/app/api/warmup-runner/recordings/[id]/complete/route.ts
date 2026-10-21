import { NextResponse } from "next/server";
import { parseRowId } from "@/lib/data/device-rules";
import { completeSession } from "@/lib/data/phone-sessions";
import { requireRunnerToken, runnerFailure } from "@/lib/warmup-runner-api";

/**
 * POST /api/warmup-runner/recordings/[id]/complete — operation 10 (PF-26):
 * every frame is up, please confirm. The dashboard counts the frames in the
 * bucket itself. { ok: true, stored: true, found, expected } means the Air
 * may delete its copy; 409 `frames_missing` with the same counts means it
 * must not, and should send the missing frames and ask again.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireRunnerToken(_request);
  if (denied) return denied;
  const id = parseRowId((await params).id);
  if (id === null) return NextResponse.json({ error: "Not a session id.", code: "invalid_body" }, { status: 400 });
  try {
    const result = await completeSession(id);
    if (!result.stored) {
      return NextResponse.json(
        {
          error: `Only ${result.found} of ${result.expected} frames are in the bucket. Keep the Air's copy and send the rest.`,
          code: "frames_missing",
          ...result,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return runnerFailure(err);
  }
}
