import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { RANGES, getAnalytics, type PlatformKey, type RangeKey } from "@/lib/data/analytics";

/** GET /api/analytics?range=7d&platform=all — powers the page's range/platform
 *  switchers without a full navigation. */
export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "7d";
  const platform = url.searchParams.get("platform") ?? "all";

  // Validate against the known sets rather than trusting the query string.
  if (!RANGES.some((r) => r.key === range)) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }
  if (!["all", "tiktok", "instagram"].includes(platform)) {
    return NextResponse.json({ error: "invalid platform" }, { status: 400 });
  }

  try {
    const { data, fetchedAt } = await getAnalytics(range as RangeKey, platform as PlatformKey);
    return NextResponse.json({ data, fetchedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 502 },
    );
  }
}
