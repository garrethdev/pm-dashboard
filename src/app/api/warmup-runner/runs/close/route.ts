import { NextResponse } from "next/server";
import { closeRun } from "@/lib/data/warmup-runs";
import {
  parseInstant,
  parseNote,
  parseRunKey,
  readBody,
  requireRunnerToken,
  runnerFailure,
} from "@/lib/warmup-runner-api";

/**
 * POST /api/warmup-runner/runs/close — operation 5 (PF-13): the run is over.
 *
 * { accountId, sessionNo, startedAt, endedAt, note }. `note` is empty when it
 * finished normally and the script's short reason when it stopped early.
 * Closing a run twice keeps the first close.
 */
export async function POST(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  try {
    const result = await closeRun(
      parseRunKey(body),
      parseInstant(body.endedAt, "endedAt"),
      parseNote(body.note),
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return runnerFailure(err);
  }
}
