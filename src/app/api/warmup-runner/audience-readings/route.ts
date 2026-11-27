import { NextResponse } from "next/server";
import { readBody, requireRunnerToken } from "@/lib/warmup-runner-api";
import { parseAudienceHandoff, runRobotAudience } from "@/server/audience-readings";
import { AiUnavailable } from "@/server/screen-readings";

/**
 * POST /api/warmup-runner/audience-readings — operation 14 (Garreth,
 * 2026-11-27): the robot's Viewers hand-off. After operation 12's uploads,
 * the Air sends, per account, the photos of the app's own "who watched"
 * page (TikTok Studio > Analytics > Viewers, 28 days); the dashboard reads
 * them with the AI and writes one audience_readings row (source 'robot'),
 * which the account's Deep page shows under "Who watches".
 *
 * Body: { read_by: "robot", audiences: [{ platform, account, period,
 * screenshots, problem }] }. Answer: { ok, audiences: [{ account, stored,
 * gap, problem }] }. The AI unreachable is a 503, so the robot sends it again.
 */
export async function POST(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  let items;
  try {
    items = parseAudienceHandoff(body);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Bad request", code: "invalid_body" }, { status: 400 });
  }
  try {
    const report = await runRobotAudience(items);
    return NextResponse.json({ ok: true, ...report }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[audience-readings] robot hand-off failed", err);
    const unavailable = err instanceof AiUnavailable;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reading failed", code: unavailable ? "ai_unavailable" : "reading_failed" },
      { status: unavailable ? 503 : 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
