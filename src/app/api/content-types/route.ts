import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  CT_DEFAULT_RANGE,
  CT_RANGES,
  getContentTypes,
  type CtRangeKey,
} from "@/lib/data/content-types";
import { getFleetDefaults } from "@/lib/data/scheduler-config";
import { getFleet } from "@/lib/fleet-server";

/** GET /api/content-types?range=28d — powers the range switcher without a full
 *  navigation. Same shape the page server-renders. */
export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const range = new URL(request.url).searchParams.get("range") ?? CT_DEFAULT_RANGE;
  if (!CT_RANGES.some((r) => r.key === range)) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }

  try {
    // Two different "fleets" in one line, which is unfortunate but real:
    // `defaults` is the scheduler's fleet-wide cadence settings, `fleet` is
    // which of Cloud / Physical this person is looking at (PF-19).
    const [{ data: defaults }, fleet] = await Promise.all([getFleetDefaults(), getFleet()]);
    const { data, fetchedAt } = await getContentTypes(
      range as CtRangeKey,
      defaults.glpWeek,
      fleet,
    );
    return NextResponse.json({ data, fetchedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 502 },
    );
  }
}
