import { NextResponse } from "next/server";
import { eligibleAccounts } from "@/lib/data/warmup-runs";
import { DAY_NAMES, etDay, getDaysOff, isDayOff, weekdayOf } from "@/lib/data/work-week";
import { requireRunnerToken, runnerFailure } from "@/lib/warmup-runner-api";

/**
 * GET /api/warmup-runner/accounts — the warmup script's operation 1 (PF-13).
 *
 * Every account the script may warm: in use, on a phone on the Physical fleet,
 * set to Automated, and not banned. The script reads it to plan the day and
 * again just before each session, in case an account was flipped back to
 * Manual. Ids are text.
 *
 * On a day off (Sunday unless changed on Settings; Garreth, 2026-10-16) the
 * list is empty, so the robot plans nothing that day and starts nothing it
 * planned before, with no change to the robot. `dayOff` names the day, for a
 * person reading the answer; the robot does not need it.
 */
export async function GET(request: Request) {
  const denied = requireRunnerToken(request);
  if (denied) return denied;
  try {
    const today = etDay(new Date());
    if (isDayOff(today, await getDaysOff())) {
      return NextResponse.json({ accounts: [], dayOff: DAY_NAMES[weekdayOf(today)] });
    }
    return NextResponse.json({ accounts: await eligibleAccounts() });
  } catch (err) {
    return runnerFailure(err);
  }
}
