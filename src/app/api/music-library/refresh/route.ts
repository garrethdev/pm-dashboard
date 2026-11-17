import { NextResponse } from "next/server";
import { requireSchedulerToken } from "@/server/carousel/machine";
import { refreshMusicTrends } from "@/server/music-trends";

/**
 * The weekly music list refresh, called Tuesdays by the schedule in
 * `vercel.json`: reads the trend lists, measures songs' TikTok video counts and
 * adds the growing ones to music_library. `?dry=1` makes every lookup but
 * writes nothing, and answers with what it would have done. See
 * src/server/music-trends.ts.
 */
export async function GET(req: Request) {
  const denied = requireSchedulerToken(req);
  if (denied) return denied;
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const report = await refreshMusicTrends(dry);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[music-library] refresh failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Refresh failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
