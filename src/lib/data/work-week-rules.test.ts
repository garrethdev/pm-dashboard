import { describe, expect, it } from "vitest";
import {
  daysOffLabel,
  isDayOff,
  parseDaysOff,
  weekdayOf,
  workingDaysBetween,
  workingDaysPerWeek,
  workingMsBetween,
} from "@/lib/data/work-week-rules";

// The days off (Garreth, 2026-10-16): Sunday, unless changed on Settings.
const SUNDAY = [0];
const HOUR = 3_600_000;

describe("parseDaysOff", () => {
  it("cleans a list into days 0 to 6, each once, in order", () => {
    expect(parseDaysOff([0])).toEqual([0]);
    expect(parseDaysOff([6, 0, 6])).toEqual([0, 6]);
    expect(parseDaysOff([])).toEqual([]);
  });

  it("refuses anything that is not days, and a week with no working day", () => {
    expect(parseDaysOff("0")).toBeNull();
    expect(parseDaysOff([7])).toBeNull();
    expect(parseDaysOff([1.5])).toBeNull();
    expect(parseDaysOff([0, 1, 2, 3, 4, 5, 6])).toBeNull();
  });
});

describe("the calendar", () => {
  it("reads weekdays from New York dates", () => {
    expect(weekdayOf("2026-10-18")).toBe(0); // a Sunday
    expect(weekdayOf("2026-10-17")).toBe(6); // a Saturday
    expect(isDayOff("2026-10-18", SUNDAY)).toBe(true);
    expect(isDayOff("2026-10-19", SUNDAY)).toBe(false);
  });

  it("counts working days and names the days off", () => {
    expect(workingDaysPerWeek(SUNDAY)).toBe(6);
    expect(workingDaysPerWeek([0, 6])).toBe(5);
    expect(daysOffLabel(SUNDAY)).toBe("Sunday");
    expect(daysOffLabel([0, 6])).toBe("Saturday and Sunday");
  });
});

describe("workingDaysBetween", () => {
  it("leaves the day off out", () => {
    // Saturday to Monday is one working day: Saturday's post is not two days late.
    expect(workingDaysBetween("2026-10-17", "2026-10-19", SUNDAY)).toBe(1);
    expect(workingDaysBetween("2026-10-16", "2026-10-19", SUNDAY)).toBe(2);
    expect(workingDaysBetween("2026-10-16", "2026-10-19", [])).toBe(3);
    expect(workingDaysBetween("2026-10-19", "2026-10-19", SUNDAY)).toBe(0);
  });
});

describe("workingMsBetween", () => {
  it("does not count the hours of a day off", () => {
    // Saturday 10:00 ET (EDT, -4) to Monday 10:00 ET: 24 working hours.
    const sat = new Date("2026-10-17T14:00:00Z");
    const mon = new Date("2026-10-19T14:00:00Z");
    expect(workingMsBetween(sat, mon, SUNDAY)).toBe(24 * HOUR);
    expect(workingMsBetween(sat, mon, [])).toBe(48 * HOUR);
    // On the Sunday itself, nothing more than Saturday's 14 hours.
    expect(workingMsBetween(sat, new Date("2026-10-18T20:00:00Z"), SUNDAY)).toBe(14 * HOUR);
  });

  it("is right across the night the clocks go back (a 25-hour Sunday)", () => {
    // Saturday 31 October 10:00 EDT to Monday 2 November 10:00 EST.
    const sat = new Date("2026-10-31T14:00:00Z");
    const mon = new Date("2026-11-02T15:00:00Z");
    expect(workingMsBetween(sat, mon, SUNDAY)).toBe(24 * HOUR);
  });
});
