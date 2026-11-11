import { describe, expect, it } from "vitest";
import { REST_FOR_THE_DAY_NOTES, restedBy, warmupModeForDay } from "@/lib/data/warmup-rest";
import { warmupItemsFor, workFor } from "@/lib/data/todo";

// Amine plan R3 (Garreth, 2026-11-10): a warning rests an account from the
// robot for the rest of the New York day, and its warmups go to a person.

describe("restedBy", () => {
  it("rests an account whose warmup stopped for a warning, and no other stop", () => {
    expect(REST_FOR_THE_DAY_NOTES).toEqual(["warning_on_screen"]);
    const rested = restedBy([
      { account_id: "9007199254740993", outcome: "stopped", note: "warning_on_screen" },
      { account_id: "12", outcome: "stopped", note: "wrong_account" },
      { account_id: "13", outcome: "stopped", note: "error: unexpected dialog" },
      { account_id: "14", outcome: "finished", note: null },
    ]);
    expect([...rested]).toEqual(["9007199254740993"]);
  });
});

describe("warmupModeForDay", () => {
  it("makes a resting Automated account Manual for the day, and leaves every other alone", () => {
    expect(warmupModeForDay("script", true)).toBe("manual");
    expect(warmupModeForDay("script", false)).toBe("script");
    expect(warmupModeForDay("manual", true)).toBe("manual");
    expect(warmupModeForDay(null, true)).toBeNull();
  });

  it("puts a resting account's warmups on the list, tickable, even while it is paused", () => {
    const mode = warmupModeForDay("script", true);
    expect(workFor({ posting_paused: true, warmup_mode: mode }).warmups).toBe(true);
    expect(workFor({ posting_paused: true, warmup_mode: "script" }).warmups).toBe(false);
    const now = new Date("2026-11-11T17:00:00Z");
    const items = warmupItemsFor({ id: "7", warmup_mode: mode }, [], [], "2026-11-11", now);
    expect(items).toHaveLength(2);
    for (const item of items) expect(item.automated).toBeUndefined();
  });
});
