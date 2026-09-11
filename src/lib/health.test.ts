import { describe, expect, it } from "vitest";
import { fleetTone, healthRank, healthTone, needsAttention } from "@/lib/health";

/**
 * Health presentation — ordering, colour and the needs-attention grouping.
 *
 * The verdict itself lives in `v_account_health_v3` and is not tested here.
 * What is tested is the part of it that reaches the screen, because a wrong
 * order or a wrong colour on this particular list is how a banned account ends
 * up below a healthy one, or a collapsing account reads as fine.
 */

/** Every status the view can produce, worst first. */
const WORST_FIRST = [
  "banned",
  "shadowbanned",
  "collapsing",
  "system error",
  "watch",
  "tracking broken",
  "no data",
  "warming",
  "healthy",
  "inactive",
];

describe("healthRank", () => {
  it("sorts worst to best", () => {
    const shuffled = [...WORST_FIRST].reverse();
    expect([...shuffled].sort((a, b) => healthRank(a) - healthRank(b))).toEqual(WORST_FIRST);
  });

  it("puts banned first and inactive last", () => {
    expect(Math.min(...WORST_FIRST.map(healthRank))).toBe(healthRank("banned"));
    expect(Math.max(...WORST_FIRST.map(healthRank))).toBe(healthRank("inactive"));
  });

  it("ranks warming above every problem state", () => {
    // An account working as intended must never sort into the trouble at the
    // top of the list.
    for (const bad of ["banned", "shadowbanned", "collapsing", "system error", "watch"]) {
      expect(healthRank("warming")).toBeGreaterThan(healthRank(bad));
    }
  });

  it("drops an unknown status into the middle rather than the top", () => {
    const rank = healthRank("something the view has not produced before");
    expect(rank).toBeGreaterThan(healthRank("banned"));
    expect(rank).toBeLessThan(healthRank("healthy"));
  });
});

describe("healthTone", () => {
  it.each([
    ["banned", "danger"],
    ["shadowbanned", "danger"],
    ["collapsing", "orange"],
    ["system error", "orange"],
    ["watch", "warn"],
    ["warming", "accent"],
    ["healthy", "ok"],
    ["tracking broken", "neutral"],
    ["no data", "neutral"],
    ["inactive", "neutral"],
  ])("paints %s as %s", (status, tone) => {
    expect(healthTone(status)).toBe(tone);
  });

  it("never paints an unknown status as ok", () => {
    // Being wrong towards "fine" is the direction that costs something.
    expect(healthTone("unknown")).not.toBe("ok");
  });
});

describe("needsAttention", () => {
  it("includes every state where we have a problem or no verdict", () => {
    for (const status of [
      "banned",
      "shadowbanned",
      "collapsing",
      "system error",
      "watch",
      "tracking broken",
      "no data",
    ]) {
      expect(needsAttention(status), status).toBe(true);
    }
  });

  it("excludes healthy, warming and inactive", () => {
    // A parked account is a state, not a problem; a warming one is working.
    for (const status of ["healthy", "warming", "inactive"]) {
      expect(needsAttention(status), status).toBe(false);
    }
  });
});

describe("fleetTone", () => {
  it("reflects fleet size", () => {
    expect(fleetTone(45)).toBe("accent");
    expect(fleetTone(25)).toBe("warn");
    expect(fleetTone(10)).toBe("danger");
  });

  it("switches on the documented boundaries", () => {
    expect(fleetTone(31)).toBe("accent");
    expect(fleetTone(30)).toBe("warn");
    expect(fleetTone(20)).toBe("warn");
    expect(fleetTone(19)).toBe("danger");
  });
});
