import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  ACCOUNT_RANGES,
  getAccountAnalytics,
  type AccountRangeKey,
} from "@/lib/data/account-analytics";

/**
 * GET /api/account-analytics?account=<username>&platform=tiktok&range=7d
 *
 * Backs the range switcher on the account detail page without a navigation,
 * the same way /api/analytics does for the fleet page.
 */
export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const account = params.get("account");
  if (!account) return NextResponse.json({ error: "account is required" }, { status: 400 });

  const rawRange = params.get("range");
  const range: AccountRangeKey = ACCOUNT_RANGES.some((r) => r.key === rawRange)
    ? (rawRange as AccountRangeKey)
    : "7d";
  // Missing still means TikTok, as it always has. A platform with no
  // performance feed (Facebook) is refused rather than read as TikTok.
  const rawPlatform = params.get("platform") ?? "tiktok";
  if (rawPlatform !== "tiktok" && rawPlatform !== "instagram") {
    return NextResponse.json({ error: "no analytics for this platform" }, { status: 400 });
  }
  const platform = rawPlatform;

  try {
    const { data, fetchedAt } = await getAccountAnalytics(account, platform, range);
    return NextResponse.json({ data, fetchedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 502 },
    );
  }
}
