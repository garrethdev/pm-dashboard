
/**
 * The rules for the days off, as plain functions the browser can use too
 * (the posting-limit forms do). Reading and saving them: `work-week.ts`.
 *
 * The days off (Garreth, 2026-10-16): six working days a week, nothing
 * scheduled on the day off. No warmups, no posts, nothing on the To-do list,
 * and the warmup robot is given no accounts. Work left over on the day before
 * comes back on the next working day (Saturday's on Monday).
 *
 * One setting for the whole business, kept in the database (`work_week`) so
 * the dashboard, the Smart Scheduler in n8n and the warmup robot all read the
 * same days. Changed on the Settings page; Sunday unless someone changes it.
 *
 * Days are numbered as JavaScript and Postgres number them: 0 is Sunday,
 * 6 is Saturday. Always New York days, never the server's clock.
 */

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** What the business decided, and what is used if the setting cannot be read. */
export const DEFAULT_DAYS_OFF: readonly number[] = [0];

/** Cleans a list of days off: whole numbers 0 to 6, each once, in order.
 *  Null when it is not a usable list, or when it leaves no working day. */
export function parseDaysOff(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  if (!raw.every((d) => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6)) return null;
  const days = [...new Set(raw as number[])].sort((a, b) => a - b);
  return days.length < 7 ? days : null;
}

/** The weekday of a New York calendar date ("YYYY-MM-DD"), 0 = Sunday. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

export function isDayOff(day: string, daysOff: readonly number[]): boolean {
  return daysOff.includes(weekdayOf(day));
}

/** How many days a week there is work: 6 with one day off. */
export function workingDaysPerWeek(daysOff: readonly number[]): number {
  return 7 - new Set(daysOff).size;
}

/** "Sunday", "Saturday and Sunday": the days off in words, Monday first. */
export function daysOffLabel(daysOff: readonly number[]): string {
  const names = [1, 2, 3, 4, 5, 6, 0].filter((d) => daysOff.includes(d)).map((d) => DAY_NAMES[d]!);
  if (names.length <= 1) return names[0] ?? "none";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** The New York calendar date of an instant, as YYYY-MM-DD. */
export function etDay(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(at);
}

/** The calendar date `days` after a YYYY-MM-DD date. */
function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

/**
 * Working days after `from` up to and including `to` (both YYYY-MM-DD New
 * York dates). Saturday to Monday with Sunday off is 1: the day off does not
 * count against a post carried over or a warmup gone missing.
 */
export function workingDaysBetween(from: string, to: string, daysOff: readonly number[]): number {
  let count = 0;
  for (let day = addDays(from, 1); day <= to; day = addDays(day, 1)) {
    if (!isDayOff(day, daysOff)) count += 1;
  }
  return count;
}

/** The start of a New York calendar date, as an instant. Read from New York's
 *  offset at that midnight (the same way as startOfDayET in
 *  warmup-sessions.ts), so the two days a year the clocks move are right. */
function startOfEtDay(day: string): Date {
  const utcMidnight = new Date(`${day}T00:00:00Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "longOffset" })
    .formatToParts(utcMidnight)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offset ?? "");
  if (!match) return utcMidnight;
  const minutes = (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
  return new Date(utcMidnight.getTime() - minutes * 60_000);
}

/**
 * Milliseconds between two instants, leaving out the time that fell on a day
 * off. A post handed out on Saturday at 10:00 has waited 24 working hours on
 * Monday at 10:00, not 48, so it goes overdue on Monday and not on Sunday.
 */
export function workingMsBetween(from: Date, to: Date, daysOff: readonly number[]): number {
  if (to <= from) return 0;
  let total = to.getTime() - from.getTime();
  if (daysOff.length === 0) return total;
  for (let day = etDay(from); day <= etDay(to); day = addDays(day, 1)) {
    if (!isDayOff(day, daysOff)) continue;
    const start = Math.max(startOfEtDay(day).getTime(), from.getTime());
    const end = Math.min(startOfEtDay(addDays(day, 1)).getTime(), to.getTime());
    if (end > start) total -= end - start;
  }
  return total;
}
