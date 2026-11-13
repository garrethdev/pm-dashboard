import { NextResponse } from "next/server";
import { requireSchedulerToken } from "@/server/carousel/machine";
import { recheckCreators, topUpCreators } from "@/server/follow-creators-refresh";

/**
 * The monthly refresh of Creators to follow, called by the two schedules in
 * `vercel.json` on the 1st: `?part=recheck` (look every creator up again, take
 * off the ones that no longer fit) and, half an hour later, `?part=topup` (find
 * new ones when a list is short). `?dry=1` makes every lookup but writes
 * nothing, and answers with what it would have done. See
 * src/server/follow-creators-refresh.ts.
 */
export async function GET(req: Request) {
  const denied = requireSchedulerToken(req);
  if (denied) return denied;
  const params = new URL(req.url).searchParams;
  const part = params.get("part");
  if (part !== "recheck" && part !== "topup") {
    return NextResponse.json({ error: "part must be recheck or topup" }, { status: 400 });
  }
  const dry = params.get("dry") === "1";
  try {
    const report = part === "recheck" ? await recheckCreators(dry) : await topUpCreators(dry);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(`[follow-creators] ${part} failed`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Refresh failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
