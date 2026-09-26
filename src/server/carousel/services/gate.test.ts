import { describe, expect, it } from "vitest";
import { gateDeck, similarity } from "./gate";
import { wrapText } from "./painter";

const contract = [
  { role: "hook", writer: "ai" as const, max_chars: 65 },
  { role: "tip", writer: "ai" as const, max_chars: 40 },
  { role: "after", writer: "fixed" as const, fixed: "the closing line" },
  { role: "caption", writer: "ai" as const, max_chars: 300 },
];

describe("the quality gate", () => {
  it("passes a clean deck at 10", () => {
    const g = gateDeck({ hook: "I stopped chasing the scale.", tip: "Water before coffee." }, contract, "I stopped chasing the scale.", []);
    expect(g.flagged).toBe(false);
    expect(g.score).toBe(10);
  });
  it("flags a line over its limit and says how far", () => {
    const g = gateDeck({ hook: "x".repeat(70), tip: "ok" }, contract, "x".repeat(70), []);
    expect(g.flagged).toBe(true);
    expect(g.kind).toBe("too_long");
    expect(g.reason).toContain("5 characters over");
    expect(g.fix).toContain("65");
  });
  it("flags a missing line", () => {
    const g = gateDeck({ hook: "A hook" }, contract, "A hook", []);
    expect(g.kind).toBe("missing");
  });
  it("flags a compliance word with the suggested fix", () => {
    const g = gateDeck({ hook: "This cures everything", tip: "ok" }, contract, "This cures everything", []);
    expect(g.kind).toBe("compliance");
    expect(g.fix).toContain("personal experience");
  });
  it("flags a hook too close to another deck's", () => {
    const h = "I lost the weight and kept it off for good";
    const g = gateDeck({ hook: h, tip: "ok" }, contract, h, ["I lost the weight and kept it off for good this time"]);
    expect(g.kind).toBe("too_similar");
  });
  it("ignores fixed roles", () => {
    const g = gateDeck({ hook: "A", tip: "B" }, contract, "A", []);
    expect(g.flagged).toBe(false);
  });
});

describe("similarity", () => {
  it("is 1 for the same words and 0 for none shared", () => {
    expect(similarity("water before coffee", "coffee before water")).toBe(1);
    expect(similarity("water before coffee", "walk after dinner")).toBe(0);
  });
});

describe("the painter's wrap", () => {
  it("wraps greedily at the width and keeps explicit newlines", () => {
    expect(wrapText("one two three four five six", 60, 700)).toEqual(["one two three four", "five six"]);
    expect(wrapText("a\nb", 60, 600)).toEqual(["a", "b"]);
  });
});
