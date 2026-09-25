import { describe, expect, it } from "vitest";
import { batchLetter, batchName, isStalled, nextAutoDecision, type AutoDeckSnapshot } from "./runner";

describe("batch naming", () => {
  it.each([[0, "a"], [25, "z"], [26, "aa"], [27, "ab"], [701, "zz"], [702, "aaa"]])("sequence %s is %s", (index, expected) => expect(batchLetter(Number(index))).toBe(expected));
  it("requires valid date and prefix", () => {
    expect(batchName("glowup", "2026-09-25", 26)).toBe("glowup-2026-09-25-aa");
    expect(() => batchName("glowup", "2026-02-30", 0)).toThrow();
    expect(() => batchName("a/b", "2026-09-25", 0)).toThrow();
    expect(() => batchLetter(-1)).toThrow();
  });
});
describe("stalled runner", () => {
  const lastMovementAt = "2026-09-25T00:00:00Z";
  it("uses the 60-second boundary only for working phases", () => {
    const now = Date.parse(lastMovementAt);
    expect(isStalled({ phase: "generating", lastMovementAt, now: now + 59_999 })).toBe(false);
    expect(isStalled({ phase: "generating", lastMovementAt, now: now + 60_000 })).toBe(true);
    expect(isStalled({ phase: "in_review", lastMovementAt, now: now + 3600_000 })).toBe(false);
    expect(isStalled({ phase: "rendering", lastMovementAt, now: now - 1 })).toBe(false);
  });
});
describe("Auto never approves", () => {
  const deck: AutoDeckSnapshot = { state: "flagged", attempt: 1, checksPassed: false, paused: false };
  it("rewrites until the third attempt, then drops", () => {
    expect(nextAutoDecision(deck)).toBe("rewrite");
    expect(nextAutoDecision({ ...deck, attempt: 2 })).toBe("rewrite");
    expect(nextAutoDecision({ ...deck, attempt: 3 })).toBe("drop");
  });
  it("waits for human approval even after all checks pass", () => {
    expect(nextAutoDecision({ ...deck, state: "rendered", checksPassed: true })).toBe("await_human_approval");
  });
  it("does not drop infrastructure failures or pass unknown checks", () => {
    expect(nextAutoDecision({ ...deck, state: "failed", attempt: 3 })).toBe("needs_attention");
    expect(nextAutoDecision({ ...deck, state: "written" })).toBe("needs_attention");
  });
  it("honours pause without cancelling in-flight work or rewriting approved decks", () => {
    expect(nextAutoDecision({ ...deck, paused: true })).toBe("wait");
    expect(nextAutoDecision({ ...deck, state: "writing" })).toBe("wait");
    expect(nextAutoDecision({ ...deck, state: "approved", paused: true })).toBe("settled");
  });
});
