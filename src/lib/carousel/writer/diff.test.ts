import { describe, expect, it } from "vitest";
import { diffWords } from "./diff";

const join = (parts: ReturnType<typeof diffWords>, keep: "added" | "removed") => parts.filter((p) => p.kind === "same" || p.kind === keep).map((p) => p.text).join("");

describe("the proposal shown against the active Writing", () => {
  it("marks only what changed", () => {
    const parts = diffWords("Keep every line under twelve words, warm and plain.", "Keep every line under eight words, warm and plain.");
    expect(parts.filter((p) => p.kind !== "same")).toEqual([{ kind: "removed", text: "twelve " }, { kind: "added", text: "eight " }]);
  });
  it("joins back into the proposal", () => {
    const before = "Open on the mirror.\n\nThe last slide names one habit.";
    const after = "Open on the mirror, in under eight words.\n\nThe last slide names one habit and never a product.";
    expect(join(diffWords(before, after), "added").replace(/\s+/g, " ")).toBe(after.replace(/\s+/g, " "));
  });
  it("shows a first draft as all new", () => {
    expect(diffWords("", "Write warmly.")).toEqual([{ kind: "added", text: "Write warmly." }]);
  });
});
