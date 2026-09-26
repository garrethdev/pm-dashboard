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

describe("the painter's quote rule", () => {
  it("wraps slide 1 in quotes only for the hook types the template names", async () => {
    const { paintDeck } = await import("./painter");
    const template = {
      slug: "t", version: 1, image_rules: { one: "one" },
      canvas: { width: 1080, height: 1920, background: null },
      text_styles: { caption: { fill: "#FFFFFF", wrap: { rule: "greedy_whitespace", width: 952 }, align: "center" } },
      slides: [{ n: 1, layout: "single", cells: [{ x: 0, y: 0, w: 1080, h: 1920 }], images: { rule: "one" }, text: [{ role: "slide_1", style: "caption", size: 72, anchor: { kind: "top", y: 105 }, quote: { when_hook_type: ["Jealous Friend"], open: "“", close: "”" } }] }],
    };
    const assets = [{ library_id: "lib", image_id: "a", public_url: "https://x/a.jpg", is_cover: false, set_name: "s", subset_name: null, luminance: null, status: "active" }];
    const quoted = paintDeck(template as never, assets, "lib", "deck-1", { slide_1: "she said it", hook_type: "Jealous Friend" });
    const plain = paintDeck(template as never, assets, "lib", "deck-1", { slide_1: "she said it", hook_type: "Open Loop" });
    expect(quoted[0].svg).toContain("“she said it”");
    expect(plain[0].svg).not.toContain("“");
    expect(quoted[0].imageUrls).toEqual(["https://x/a.jpg"]);
  });
});
