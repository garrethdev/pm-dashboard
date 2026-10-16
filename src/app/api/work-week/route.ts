import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { NOTIFICATIONS_TAG, TODO_TAG, WORK_WEEK_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import { daysOffLabel, getDaysOff, parseDaysOff, setDaysOff, workingDaysPerWeek } from "@/lib/data/work-week";

/** GET /api/work-week — the days off now, for the posting-limit forms. */
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const daysOff = await getDaysOff();
  return NextResponse.json({ daysOff, workingDays: workingDaysPerWeek(daysOff), label: daysOffLabel(daysOff) });
}

/**
 * POST /api/work-week — change the days off (Garreth, 2026-10-16).
 *
 * Body: `{ daysOff: number[] }`, 0 = Sunday … 6 = Saturday, New York days.
 * At least one working day has to be left. The To-do list, the bell, the
 * posting limits, the Smart Scheduler and the warmup robot all follow it.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { daysOff?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const daysOff = parseDaysOff(body.daysOff);
  if (!daysOff) {
    return NextResponse.json(
      { error: "Pick the days off as days of the week, leaving at least one working day" },
      { status: 400 },
    );
  }

  try {
    const userEmail = await actingUserEmail();
    const before = await getDaysOff();
    await setDaysOff(daysOff);
    await auditLog({
      userEmail,
      action: "days_off_change",
      target: "work_week",
      oldValue: { days_off: before },
      newValue: { days_off: daysOff },
    });
    revalidateTag(WORK_WEEK_TAG, { expire: 0 });
    revalidateTag(TODO_TAG, { expire: 0 });
    revalidateTag(NOTIFICATIONS_TAG, { expire: 0 });
    return NextResponse.json({ ok: true, daysOff, label: daysOffLabel(daysOff) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "saving the days off failed" },
      { status: 502 },
    );
  }
}
