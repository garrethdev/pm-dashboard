import { NextResponse } from "next/server";
import { parseRowId } from "@/lib/data/device-rules";
import { FRAME_BATCH_LIMIT, signFrameBatch, type FrameRequest } from "@/lib/data/phone-sessions";
import { FRAME_TYPES, MAX_FRAMES_PER_SESSION } from "@/lib/data/phone-session-rules";
import { RunnerError } from "@/lib/data/warmup-runs";
import { readBody, requireRunnerToken, runnerFailure } from "@/lib/warmup-runner-api";

function invalid(message: string): never {
  throw new RunnerError(message, 400, "invalid_body");
}

/** { frames: [{ index, elapsedSec, type }] }, at most FRAME_BATCH_LIMIT of them. */
function parseFrames(raw: unknown): FrameRequest[] {
  if (!Array.isArray(raw) || raw.length === 0) invalid("frames must be a list with at least one frame.");
  if (raw.length > FRAME_BATCH_LIMIT) invalid(`Ask for at most ${FRAME_BATCH_LIMIT} links in one call.`);
  return raw.map((f, i) => {
    const o = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
    const index = o.index;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= MAX_FRAMES_PER_SESSION) {
      invalid(`frames[${i}].index must be a whole number from 0 to ${MAX_FRAMES_PER_SESSION - 1}.`);
    }
    const elapsed = o.elapsedSec;
    if (typeof elapsed !== "number" || !Number.isFinite(elapsed) || elapsed < 0 || elapsed > 86_400) {
      invalid(`frames[${i}].elapsedSec must be seconds since the first frame, 0 to 86400.`);
    }
    const type = o.type === undefined ? "image/jpeg" : o.type;
    if (typeof type !== "string" || !FRAME_TYPES[type]) {
      invalid(`frames[${i}].type must be one of ${Object.keys(FRAME_TYPES).join(", ")}.`);
    }
    return { index, elapsedSec: elapsed, type };
  });
}

/**
 * POST /api/warmup-runner/recordings/[id]/frames — operation 9 (PF-26):
 * one-time upload links for a batch of a session's frames. The Air PUTs
 * each frame's bytes to its link, Content-Type set, then calls operation 10.
 * Answers { ok, status, uploads: [{ index, path, url }] }; `uploads` is empty
 * when the session is already stored.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const id = parseRowId((await params).id);
  if (id === null) return NextResponse.json({ error: "Not a session id.", code: "invalid_body" }, { status: 400 });
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  try {
    const result = await signFrameBatch(id, parseFrames(body.frames));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return runnerFailure(err);
  }
}
