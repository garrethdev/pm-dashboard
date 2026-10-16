"use client";

import { useEffect, useState } from "react";
import { DEFAULT_DAYS_OFF, parseDaysOff, workingDaysPerWeek } from "@/lib/data/work-week-rules";

/**
 * The days off, for the forms that check a weekly number against posts a
 * day (Garreth, 2026-10-16: 6 working days, so 1 a day is at most 6 a week).
 *
 * Read once per page from `/api/work-week` and shared by every form on it.
 * Until the answer lands, and if it never does, it is Sunday off: what was
 * decided. The server checks every save again with the real setting, so a
 * form that guessed wrong is refused with a sentence, never saved wrong.
 */
let pending: Promise<number[]> | null = null;

function readDaysOff(): Promise<number[]> {
  pending ??= fetch("/api/work-week", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((body: { daysOff?: unknown } | null) => parseDaysOff(body?.daysOff) ?? [...DEFAULT_DAYS_OFF])
    .catch(() => {
      pending = null; // try again next time a form opens
      return [...DEFAULT_DAYS_OFF];
    });
  return pending;
}

export function useWorkingDays(): number {
  const [daysOff, setDaysOff] = useState<readonly number[]>(DEFAULT_DAYS_OFF);
  useEffect(() => {
    let live = true;
    void readDaysOff().then((days) => {
      if (live) setDaysOff(days);
    });
    return () => {
      live = false;
    };
  }, []);
  return workingDaysPerWeek(daysOff);
}
