import { NextResponse } from "next/server";
import { requireSchedulerToken } from "@/server/carousel/machine";
import { DEFAULT_LIMIT, runContentTags } from "@/server/content-tags";

/**
 * Content tagging (DA-03), run every day by the schedule in `vercel.json`:
 * tags whatever has posted since the last run. `?limit=` takes more at once
 * (the first catch-up), up to 200; `?dry=1` reads and pulls every picture but
 * neither asks the AI nor writes, and answers with the rows it would write.
 */
export async function GET(req: Request) {
  const denied = requireSchedulerToken(req);
  if (denied) return denied;
  const params = new URL(req.url).searchParams;
  const asked = Number(params.get("limit"));
  const limit = Number.isInteger(asked) && asked > 0 ? Math.min(asked, 200) : DEFAULT_LIMIT;
  const dry = params.get("dry") === "1";
  try {
    const report = await runContentTags(limit, dry);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[content-tags] run failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Tagging failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
