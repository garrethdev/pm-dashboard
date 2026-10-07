import { NextResponse } from "next/server";
import { requireSchedulerToken } from "@/server/carousel/machine";
import { type RunMode, runFacebookIngest } from "@/server/facebook-analytics";

/**
 * The Facebook analytics robot (PF-24), run every day by the schedule in
 * `vercel.json`, after TikTok's read: full on Sun/Mon/Wed/Fri, light on
 * Tue/Thu/Sat, as TikTok's are. `?mode=full|light` overrides the day. It answers with what it read, per account, and how many
 * ScrapeCreators credits it spent.
 */
export async function GET(req: Request) {
  const denied = requireSchedulerToken(req);
  if (denied) return denied;
  const asked = new URL(req.url).searchParams.get("mode");
  const mode: RunMode | undefined = asked === "full" || asked === "light" ? asked : undefined;
  try {
    const report = await runFacebookIngest(mode);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[facebook-analytics] ingest failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "The Facebook read failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
