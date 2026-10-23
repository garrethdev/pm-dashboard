import { NextResponse } from "next/server";
import { requireSchedulerToken } from "@/server/carousel/machine";
import { AiUnavailable, parseRunRequest, runReadings } from "@/server/screen-readings";

/**
 * The robot's hand-off (DA-06, DA-08): after uploading a post's analytics
 * screenshots to the post-screens bucket, the robot posts the list of posts
 * here and the dashboard reads them into post_screen_readings. A person can
 * send the same shape by hand. Demands CRON_SECRET, like the other jobs, and
 * is listed in src/proxy.ts so the login gate lets it through.
 *
 * Body: { "read_by": "robot", "posts": [ { "platform", "account", "caption",
 * "posted_at_text", "screenshots": ["tiktok/acct/2026-10-24/01-x.png"],
 * "problem": null } ] }. `?dry=1` matches each post and checks its screenshots
 * are in the bucket, but neither asks the AI nor writes.
 */
export async function POST(req: Request) {
  const denied = requireSchedulerToken(req);
  if (denied) return denied;
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  let parsed;
  try {
    parsed = parseRunRequest(await req.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Bad request" }, { status: 400 });
  }
  try {
    const report = await runReadings(parsed, { dry });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[screen-readings] run failed", err);
    const status = err instanceof AiUnavailable ? 503 : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Reading failed" }, { status });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
