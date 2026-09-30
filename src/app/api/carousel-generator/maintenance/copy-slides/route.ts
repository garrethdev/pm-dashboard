import { NextResponse } from "next/server";
import { logError } from "@/server/carousel/log";
import { requireSchedulerToken } from "@/server/carousel/machine";
import { copyOutstanding } from "@/server/carousel/services/slide-copies";

/**
 * Copy reference carousels' pictures into our own storage. Run once a day
 * by the schedule in `vercel.json`, and by
 * `scripts/copy-reference-slides.mjs` to work through a backlog. It does as
 * much as fits in its time and says how much is left.
 */
export async function GET(req: Request) {
  const denied = requireSchedulerToken(req);
  if (denied) return denied;
  const asked = Number(new URL(req.url).searchParams.get("seconds"));
  const seconds = Number.isFinite(asked) && asked > 0 ? Math.min(asked, 270) : 45;
  try {
    const report = await copyOutstanding({ budgetMs: seconds * 1000 });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logError("copy slides", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "The copy failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
