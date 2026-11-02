import { NextResponse } from "next/server";
import { readBody, requireRunnerToken } from "@/lib/warmup-runner-api";
import { AiUnavailable, failedSummary, parseRunRequest, runReadings } from "@/server/screen-readings";

/**
 * POST /api/warmup-runner/screen-readings — operation 13 (DA-06, DA-08):
 * the robot's hand-off. After operation 12's uploads, the Air sends the list
 * of posts and their screenshot paths; the dashboard reads them with the
 * DA-05 reader and writes post_screen_readings. The same job as
 * /api/screen-readings/run, behind the dashboard token the robot already
 * holds instead of the schedule's secret.
 *
 * Body: { read_by: "robot", posts: [{ platform, account, caption,
 * posted_at_text, screenshots, problem }] }. Answer: the reading report.
 * If any post failed inside the dashboard (`failed`), the answer is a 503
 * with the report and the first reason, so the robot sends it again (its
 * retries) and logs the reason if it still fails; the posts already stored
 * are recognised by their screenshots and not read twice.
 */
export async function POST(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  let parsed;
  try {
    parsed = parseRunRequest(body);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Bad request", code: "invalid_body" }, { status: 400 });
  }
  try {
    const report = await runReadings(parsed);
    const failed = failedSummary(report);
    if (failed) {
      console.error("[screen-readings] robot hand-off: posts failed", failed);
      return NextResponse.json({ error: failed, code: "posts_failed", ...report }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: true, ...report }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[screen-readings] robot hand-off failed", err);
    const unavailable = err instanceof AiUnavailable;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reading failed", code: unavailable ? "ai_unavailable" : "reading_failed" },
      { status: unavailable ? 503 : 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
