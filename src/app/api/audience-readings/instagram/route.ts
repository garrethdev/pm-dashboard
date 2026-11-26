import { NextResponse } from "next/server";
import { requireSchedulerToken } from "@/server/carousel/machine";
import { runInstagramAudience } from "@/server/audience-readings";

/**
 * The weekly Instagram audience pull, called Fridays by the schedule in
 * `vercel.json`: each active Instagram account's engaged audience this month
 * (gender, age, country) into audience_readings. `?dry=1` asks Instagram and
 * writes nothing. See src/server/audience-readings.ts.
 */
export async function GET(req: Request) {
  const denied = requireSchedulerToken(req);
  if (denied) return denied;
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    return NextResponse.json(await runInstagramAudience(dry), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[audience-readings] instagram failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Audience pull failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;
