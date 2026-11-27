import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getRobotUpdate, ROBOT_UPDATES_BUCKET } from "@/lib/data/robot-updates";

/**
 * GET /api/robot-updates/<version>/download: the Download button on the Robot
 * updates pages (2026-11-27).
 *
 * Signed in only. Answers with a redirect to a ten-minute link straight to
 * the file in the private robot-updates bucket, named as "Update the robot"
 * expects (warmup-runner-<date>-<code>.tar.gz), so the browser saves it into
 * Downloads where that button looks. The file never passes through this
 * server: at about 64 MB it would be over Vercel's response limit.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ version: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { version } = await params;
  let update;
  try {
    update = await getRobotUpdate(version);
  } catch (err) {
    console.error("robot update lookup failed:", err);
    return NextResponse.json({ error: "The list of robot updates could not be read. Try again." }, { status: 502 });
  }
  if (!update) return NextResponse.json({ error: "There is no robot update with that name." }, { status: 404 });

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL;
  if (!key || !base) return NextResponse.json({ error: "Storage is not configured." }, { status: 500 });

  const path = update.filePath.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${base}/storage/v1/object/sign/${ROBOT_UPDATES_BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 600 }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  }).catch((err: unknown) => {
    console.error("robot update signing failed:", err);
    return null;
  });
  if (!res?.ok) {
    if (res) console.error(`robot update signing failed (HTTP ${res.status}):`, await res.text().catch(() => ""));
    return NextResponse.json({ error: "The download link could not be made. Try again." }, { status: 502 });
  }
  const { signedURL } = (await res.json()) as { signedURL?: string };
  if (!signedURL) return NextResponse.json({ error: "The download link could not be made. Try again." }, { status: 502 });

  // `download=` makes Storage send the file as an attachment with this name.
  const url = new URL(`${base}/storage/v1${signedURL}`);
  url.searchParams.set("download", `${update.version}.tar.gz`);
  return NextResponse.redirect(url.toString(), { status: 302, headers: { "Cache-Control": "no-store" } });
}
