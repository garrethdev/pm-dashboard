import { TTL, WORK_WEEK_TAG, cachedFetcher } from "@/lib/data/cache";
import { sbRest } from "@/lib/data/supabase";
import { sbFetch } from "@/lib/data/warmup-sessions";
import { DEFAULT_DAYS_OFF, parseDaysOff } from "@/lib/data/work-week-rules";

export * from "@/lib/data/work-week-rules";

/**
 * Reading and saving the days off (Garreth, 2026-10-16). The rules
 * themselves are in `work-week-rules.ts`, re-exported here.
 */

async function readDaysOff(): Promise<number[]> {
  const rows = await sbRest<{ days_off: unknown }[]>("work_week?select=days_off&limit=1");
  return parseDaysOff(rows[0]?.days_off) ?? [...DEFAULT_DAYS_OFF];
}

const cachedDaysOff = cachedFetcher(WORK_WEEK_TAG, TTL.supabase, readDaysOff);

/**
 * The days off now. Falls back to Sunday when the setting cannot be read, so
 * a database hiccup never puts work on the day off (and never takes it away
 * from a working day: Sunday is what was decided).
 */
export async function getDaysOff(): Promise<number[]> {
  try {
    return (await cachedDaysOff()).data;
  } catch {
    return [...DEFAULT_DAYS_OFF];
  }
}

/** Saves new days off. The caller has already checked them with parseDaysOff,
 *  and expires WORK_WEEK_TAG and TODO_TAG afterwards. */
export async function setDaysOff(daysOff: number[]): Promise<void> {
  const res = await sbFetch("work_week?id=eq.true", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ days_off: daysOff, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Couldn't save the days off (HTTP ${res.status})`);
  const rows = (await res.json()) as unknown[];
  if (rows.length !== 1) throw new Error("The work week setting is missing from the database");
}
