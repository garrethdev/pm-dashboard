import { NextResponse } from "next/server";
import { logError } from "@/server/carousel/log";
import { requireSchedulerToken } from "@/server/carousel/machine";
import { makeOutstandingCopies } from "@/server/carousel/services/picture-copies";

/**
 * Make the small copies of library and Trends pictures that are still
 * missing (src/server/carousel/services/picture-copies.ts). Run once a day by
 * the schedule in `vercel.json`, and by `scripts/make-picture-copies.mjs` to
 * work through a backlog. `?limit=10` makes at most ten and lists them, for a
 * look before a full run.
 */
export async function GET(req: Request) {
  const denied = requireSchedulerToken(req);
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  const asked = Number(q.get("seconds"));
  const seconds = Number.isFinite(asked) && asked > 0 ? Math.min(asked, 270) : 240;
  const limit = Number(q.get("limit"));
  try {
    const report = await makeOutstandingCopies({ budgetMs: seconds * 1000, limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : undefined });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logError("picture copies", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "The copy job failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
