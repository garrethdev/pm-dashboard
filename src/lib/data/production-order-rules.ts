/**
 * "To produce" on the What to make next card, as a plain function so it can
 * be tested without a page.
 *
 * Since 2026-10-19 a new content type has a priority week: the Smart Scheduler
 * gives it to every account first, every working day, for 7 days, and its
 * sister types get less until it ends. So a row can carry two rates:
 * `weeklyDemand`, which holds for `currentRateDays` more days, and
 * `normalWeeklyDemand`, which applies after. With no priority week running,
 * `currentRateDays` is null and this is the old `weekly x days/7 - pool`.
 *
 * Mirrors produce_to_reach_21d in scheduler_production_order_fleet, which is
 * this at 21 days.
 */
export function toProduce(
  row: {
    weeklyDemand: number;
    normalWeeklyDemand: number;
    currentRateDays: number | null;
    usablePool: number;
  },
  days: number,
): number {
  const atCurrent = Math.min(days, row.currentRateDays ?? days);
  const atNormal = Math.max(0, days - atCurrent);
  const need = (row.weeklyDemand * atCurrent + row.normalWeeklyDemand * atNormal) / 7;
  // Rounded to six places before the ceiling, so floating-point noise such as
  // 25.000000000000004 does not add one.
  return Math.max(0, Math.ceil(Math.round((need - row.usablePool) * 1e6) / 1e6));
}

/** "New · until Oct 26", or before its first piece "New · starts at first piece". */
export function newTypeLabel(priorityUntil: string | null): string {
  if (!priorityUntil) return "New · starts at first piece";
  const d = new Date(`${priorityUntil}T00:00:00Z`);
  return `New · until ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}
