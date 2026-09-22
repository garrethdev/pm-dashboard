import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getCalendarDay, getCalendarMonth } from "@/lib/data/calendar";
import { getFleet } from "@/lib/fleet-server";

/**
 * GET /api/calendar?month=2026-09   → month grid
 * GET /api/calendar?day=2026-09-05  → one day expanded
 *
 * Backs the Content Calendar's month stepper and day panel without a full
 * navigation, matching how the Inventory window switcher works.
 *
 * The fleet is not a query parameter: it is the person's own cookie, read here
 * the same way the page reads it, so stepping through months on Physical stays
 * on Physical without the client having to carry it (PF-19).
 */
const MONTH_RE = /^(\d{4})-(\d{2})$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const url = new URL(request.url);
  const day = url.searchParams.get("day");
  const month = url.searchParams.get("month");
  const fleet = await getFleet();

  try {
    if (day) {
      if (!DAY_RE.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) {
        return NextResponse.json({ error: "invalid day" }, { status: 400 });
      }
      const { data, fetchedAt, stale } = await getCalendarDay(day, fleet);
      return NextResponse.json({ data, fetchedAt, stale: stale ?? false });
    }

    const m = MONTH_RE.exec(month ?? "");
    if (!m) return NextResponse.json({ error: "invalid month" }, { status: 400 });
    const year = Number(m[1]);
    const month1 = Number(m[2]);
    // Bounded rather than trusted: the month drives a date range straight into
    // a set-returning function, and a stray year would scan the whole table.
    if (month1 < 1 || month1 > 12 || year < 2020 || year > 2100) {
      return NextResponse.json({ error: "month out of range" }, { status: 400 });
    }

    const { data, fetchedAt, stale } = await getCalendarMonth(year, month1, fleet);
    return NextResponse.json({ data, fetchedAt, stale: stale ?? false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 502 },
    );
  }
}
