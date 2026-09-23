import { describe, expect, it } from "vitest";
import { OVERDUE_HOURS, overdueFor } from "@/lib/data/todo";

// P12: the list's Overdue pill and the bell's overdue item share one rule.
describe("overdueFor", () => {
  const now = new Date("2026-09-23T15:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

  it("is not overdue a moment before the bell's cutoff", () => {
    expect(overdueFor(hoursAgo(OVERDUE_HOURS - 0.1), now)).toBeNull();
  });

  it("is overdue from the cutoff on, in hours", () => {
    expect(overdueFor(hoursAgo(24), now)).toBe("24 h");
    expect(overdueFor(hoursAgo(26.5), now)).toBe("26 h");
  });

  it("switches to days from 48 hours", () => {
    expect(overdueFor(hoursAgo(47.9), now)).toBe("47 h");
    expect(overdueFor(hoursAgo(48), now)).toBe("2 days");
    expect(overdueFor(hoursAgo(80), now)).toBe("3 days");
  });
});
