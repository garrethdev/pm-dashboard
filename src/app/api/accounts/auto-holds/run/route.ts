import { NextResponse } from "next/server";
import { requireSchedulerToken } from "@/server/carousel/machine";
import { runAutoHolds } from "@/server/auto-holds";

/**
 * The daily run of the two automatic account rules (Garreth, 2026-11-25),
 * called early each New York morning by the schedule in `vercel.json`:
 * settles the holds that have done their time, then starts new ones. `?dry=1`
 * reads everything and writes nothing, and answers with what it would have
 * done. See src/server/auto-holds.ts.
 */
export async function GET(req: Request) {
  const denied = requireSchedulerToken(req);
  if (denied) return denied;
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const report = await runAutoHolds({ dry });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[auto-holds] run failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Run failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;
