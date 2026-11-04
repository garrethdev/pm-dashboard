import { NextResponse } from "next/server";
import { requireSchedulerToken } from "@/server/carousel/machine";
import { relinkReadings } from "@/server/screen-readings";

/**
 * Links the robot's readings to their posts once the platforms' own fetches
 * have them (DA-06): the robot reads posts within hours of posting, before
 * they are in the performance tables. Run daily by the schedule in
 * `vercel.json`, after the Instagram and Facebook fetches. Demands
 * CRON_SECRET and is listed in src/proxy.ts. `?dry=1` reports what it would
 * change without writing.
 */
export async function GET(req: Request) {
  const denied = requireSchedulerToken(req);
  if (denied) return denied;
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const report = await relinkReadings({ dry });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[screen-readings] relink failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Re-linking failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
