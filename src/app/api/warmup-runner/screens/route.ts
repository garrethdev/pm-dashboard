import { NextResponse } from "next/server";
import { readBody, requireRunnerToken } from "@/lib/warmup-runner-api";
import { parseScreenLinks, signScreenBatch } from "@/server/screen-readings";

/**
 * POST /api/warmup-runner/screens — operation 12 (DA-06): one-time upload
 * links for a batch of analytics screenshots. The Air PUTs each picture's
 * bytes to its link, Content-Type set, then hands the posts over with
 * operation 13. Same door as the session recorder's frames (operation 9):
 * the Air holds only the dashboard token, never a project key.
 *
 * Body: { screens: [{ path, type? }] }, at most 200. Each path is the
 * screenshot's place in the post-screens bucket, as the robot names it.
 * Answer: { ok, uploads: [{ path, url }] }.
 */
export async function POST(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "The body is not JSON.", code: "invalid_body" }, { status: 400 });
  let screens;
  try {
    screens = parseScreenLinks(body);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Bad request", code: "invalid_body" }, { status: 400 });
  }
  try {
    const uploads = await signScreenBatch(screens);
    return NextResponse.json({ ok: true, uploads }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[screens] signing failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Signing failed", code: "storage_failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
