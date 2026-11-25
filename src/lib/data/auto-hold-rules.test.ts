import { describe, expect, it } from "vitest";
import {
  daysBothWarmupsDone,
  hasZeroStreak,
  missedWarmupDays,
  settleOpenHold,
  type PostRead,
  type SessionLite,
} from "./auto-hold-rules";

const SUNDAY_OFF = [0];

/** One reading of a post, taken `ageHours` after it went up. */
function read(postId: string, postedAt: string, views: number | null, ageHours = 24): PostRead {
  return {
    postId,
    postedAt,
    views,
    readAt: new Date(Date.parse(postedAt) + ageHours * 3_600_000).toISOString(),
  };
}

describe("three 0-view posts in a row", () => {
  it("fires when the newest three all read 0", () => {
    const reads = [
      read("a", "2026-11-20T15:00:00Z", 0),
      read("b", "2026-11-21T15:00:00Z", 0),
      read("c", "2026-11-22T15:00:00Z", 0),
      read("old", "2026-11-10T15:00:00Z", 500),
    ];
    expect(hasZeroStreak(reads)).toBe(true);
  });

  it("does not fire when one of the three has views", () => {
    const reads = [
      read("a", "2026-11-20T15:00:00Z", 0),
      read("b", "2026-11-21T15:00:00Z", 3),
      read("c", "2026-11-22T15:00:00Z", 0),
    ];
    expect(hasZeroStreak(reads)).toBe(false);
  });

  it("takes the best reading of a post, so a later read with views clears it", () => {
    const reads = [
      read("a", "2026-11-20T15:00:00Z", 0),
      read("b", "2026-11-21T15:00:00Z", 0),
      read("c", "2026-11-22T15:00:00Z", 0, 13),
      read("c", "2026-11-22T15:00:00Z", 40, 30),
    ];
    expect(hasZeroStreak(reads)).toBe(false);
  });

  it("waits for a post read too soon after it went up", () => {
    const reads = [
      read("a", "2026-11-20T15:00:00Z", 0),
      read("b", "2026-11-21T15:00:00Z", 0),
      read("c", "2026-11-22T15:00:00Z", 0, 5),
    ];
    expect(hasZeroStreak(reads)).toBe(false);
  });

  it("needs three posts", () => {
    expect(hasZeroStreak([read("a", "2026-11-20T15:00:00Z", 0), read("b", "2026-11-21T15:00:00Z", 0)])).toBe(false);
  });

  it("ignores the posts from before a hold ended", () => {
    const reads = [
      read("a", "2026-11-20T15:00:00Z", 0),
      read("b", "2026-11-21T15:00:00Z", 0),
      read("c", "2026-11-22T15:00:00Z", 0),
      read("d", "2026-11-26T15:00:00Z", 0),
    ];
    expect(hasZeroStreak(reads, "2026-11-25T18:00:00+00:00")).toBe(false);
    const more = [...reads, read("e", "2026-11-27T15:00:00Z", 0), read("f", "2026-11-28T15:00:00Z", 0)];
    expect(hasZeroStreak(more, "2026-11-25T18:00:00+00:00")).toBe(true);
  });
});

describe("working days the robot missed", () => {
  // 2026-11-23 is a Monday.
  const at = (s: string) => new Date(s);

  it("counts full days between the last warmup and today, not today", () => {
    // Warmed Monday afternoon; checked early Thursday: Tue and Wed missed.
    expect(missedWarmupDays("2026-11-23T19:00:00Z", null, at("2026-11-26T05:30:00Z"), SUNDAY_OFF)).toBe(2);
    // Checked early Wednesday: only Tuesday missed.
    expect(missedWarmupDays("2026-11-23T19:00:00Z", null, at("2026-11-25T05:30:00Z"), SUNDAY_OFF)).toBe(1);
  });

  it("does not count Sunday", () => {
    // Warmed Friday 11-21; checked early Monday 11-24: Saturday missed, Sunday off.
    expect(missedWarmupDays("2026-11-21T19:00:00Z", null, at("2026-11-24T05:30:00Z"), SUNDAY_OFF)).toBe(1);
  });

  it("is 0 when warmed yesterday or today", () => {
    expect(missedWarmupDays("2026-11-24T19:00:00Z", null, at("2026-11-25T05:30:00Z"), SUNDAY_OFF)).toBe(0);
    expect(missedWarmupDays("2026-11-25T06:00:00Z", null, at("2026-11-25T08:00:00Z"), SUNDAY_OFF)).toBe(0);
  });

  it("counts from the move onto the phone when never warmed, and says nothing with neither", () => {
    expect(missedWarmupDays(null, "2026-11-23T19:00:00Z", at("2026-11-26T05:30:00Z"), SUNDAY_OFF)).toBe(2);
    expect(missedWarmupDays(null, null, at("2026-11-26T05:30:00Z"), SUNDAY_OFF)).toBeNull();
  });
});

/** A hand warmup at a New York afternoon on `day`. */
function hand(day: string, sessionNo: number, minutes = 15, mode: "manual" | "script" = "manual"): SessionLite {
  return { startedAt: `${day}T19:00:00Z`, minutes, sessionNo, mode };
}

describe("days with both warmups done by hand", () => {
  it("counts a day only when both warmups reach 15 minutes", () => {
    const s = [hand("2026-11-25", 1), hand("2026-11-25", 2), hand("2026-11-26", 1), hand("2026-11-26", 2, 10)];
    expect(daysBothWarmupsDone(s, "2026-11-25")).toBe(1);
  });

  it("adds minutes up across rows of the same warmup", () => {
    const s = [hand("2026-11-25", 1), hand("2026-11-25", 2, 10), hand("2026-11-25", 2, 6)];
    expect(daysBothWarmupsDone(s, "2026-11-25")).toBe(1);
  });

  it("leaves out days before the hold and the robot's warmups", () => {
    const s = [
      hand("2026-11-24", 1),
      hand("2026-11-24", 2),
      hand("2026-11-25", 1, 15, "script"),
      hand("2026-11-25", 2, 15, "script"),
    ];
    expect(daysBothWarmupsDone(s, "2026-11-25")).toBe(0);
  });
});

describe("settling an open hold", () => {
  const paused = { isActive: true, postingPaused: true, warmupMode: "manual" as const };
  const twoDays = [hand("2026-11-25", 1), hand("2026-11-25", 2), hand("2026-11-26", 1), hand("2026-11-26", 2)];

  it("puts a zero-views hold back after 2 days of hand warmups, not 1", () => {
    const hold = { rule: "zero_views" as const, startDay: "2026-11-25", daysNeeded: 2 };
    expect(settleOpenHold(hold, paused, twoDays.slice(0, 2))).toBeNull();
    expect(settleOpenHold(hold, paused, twoDays)).toBe("restored");
  });

  it("puts a robot-failing hold back after 1 day", () => {
    const hold = { rule: "robot_failing" as const, startDay: "2026-11-25", daysNeeded: 1 };
    const manual = { isActive: true, postingPaused: false, warmupMode: "manual" as const };
    expect(settleOpenHold(hold, manual, twoDays.slice(0, 2))).toBe("restored");
  });

  it("steps aside when somebody changed the account by hand", () => {
    const zero = { rule: "zero_views" as const, startDay: "2026-11-25", daysNeeded: 2 };
    expect(settleOpenHold(zero, { ...paused, postingPaused: false }, [])).toBe("overridden");
    const robot = { rule: "robot_failing" as const, startDay: "2026-11-25", daysNeeded: 1 };
    expect(settleOpenHold(robot, { ...paused, warmupMode: "script" }, [])).toBe("overridden");
  });

  it("never puts back a retire-asked account on its own", () => {
    const again = { rule: "zero_views_again" as const, startDay: "2026-11-25", daysNeeded: null };
    expect(settleOpenHold(again, paused, twoDays)).toBeNull();
  });

  it("closes the hold when the account is retired", () => {
    const hold = { rule: "zero_views" as const, startDay: "2026-11-25", daysNeeded: 2 };
    expect(settleOpenHold(hold, { ...paused, isActive: false }, [])).toBe("retired");
    expect(settleOpenHold(hold, null, [])).toBe("retired");
  });
});
