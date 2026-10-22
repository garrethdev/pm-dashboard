import { describe, expect, it } from "vitest";
import { newTypeLabel, toProduce } from "@/lib/data/production-order-rules";

/**
 * The numbers are Character 6's on 2026-10-19, read from
 * scheduler_production_order_fleet the day the priority week went in:
 * Divorce Recovery new and not yet started (7 days at 18 a week, then 6.9),
 * 3-Slide Journey new until Oct 22 (4 days at 6, then 8.6).
 */
describe("toProduce", () => {
  it("is the old arithmetic when no priority week is running", () => {
    const row = { weeklyDemand: 24, normalWeeklyDemand: 24, currentRateDays: null, usablePool: 50 };
    expect(toProduce(row, 21)).toBe(22); // 72 - 50
    expect(toProduce(row, 7)).toBe(0);
  });

  it("counts the priority rate only for the days left, then the normal rate", () => {
    const row = { weeklyDemand: 18, normalWeeklyDemand: 6.9, currentRateDays: 7, usablePool: 0 };
    // 18 + 6.9 x 2 = 31.8. The database's produce_to_reach_21d read 32.
    expect(toProduce(row, 21)).toBe(32);
    expect(toProduce(row, 14)).toBe(25); // 18 + 6.9
    expect(toProduce(row, 7)).toBe(18);
  });

  it("does not count the priority rate past the horizon", () => {
    const row = { weeklyDemand: 6, normalWeeklyDemand: 8.6, currentRateDays: 4, usablePool: 0 };
    // 6 x 4/7 + 8.6 x 3/7 = 7.11
    expect(toProduce(row, 7)).toBe(8);
  });

  it("never asks for a negative amount", () => {
    const row = { weeklyDemand: 0, normalWeeklyDemand: 8.6, currentRateDays: 7, usablePool: 38 };
    expect(toProduce(row, 21)).toBe(0);
  });
});

describe("newTypeLabel", () => {
  it("names the last day of the priority week", () => {
    expect(newTypeLabel("2026-10-22")).toBe("New · until Oct 22");
  });

  it("says when the week has not started", () => {
    expect(newTypeLabel(null)).toBe("New · starts at first piece");
  });
});
