import { describe, expect, it } from "vitest";
import { batchLetter, batchName } from "./runner";

describe("batch naming", () => {
  it.each([[0, "a"], [25, "z"], [26, "aa"], [27, "ab"], [701, "zz"], [702, "aaa"]])("sequence %s is %s", (index, expected) => expect(batchLetter(Number(index))).toBe(expected));
  it("requires valid date and prefix", () => {
    expect(batchName("glowup", "2026-09-25", 26)).toBe("glowup-2026-09-25-aa");
    expect(() => batchName("glowup", "2026-02-30", 0)).toThrow();
    expect(() => batchName("a/b", "2026-09-25", 0)).toThrow();
    expect(() => batchLetter(-1)).toThrow();
  });
});
