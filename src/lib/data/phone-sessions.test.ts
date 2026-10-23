import { describe, expect, it } from "vitest";
import { effectiveKind, KIND_LABEL, parseKind, parseReview } from "./phone-sessions";

describe("what kind of session a read says it was", () => {
  it("accepts the three kinds and nothing else", () => {
    expect(parseKind("posting")).toBe("posting");
    expect(parseKind("manual_warmup")).toBe("manual_warmup");
    expect(parseKind("other")).toBe("other");
    expect(parseKind("warmup")).toBeNull();
    expect(parseKind(null)).toBeNull();
    expect(parseKind(3)).toBeNull();
  });

  it("reads the kind and its reason out of a review, and survives their absence", () => {
    const read = parseReview({
      summary: "The account was switched and left on its profile.",
      postSeen: false,
      kind: "manual_warmup",
      kindNote: "Nothing was posted; two accounts were opened and parked.",
      timeline: [],
      anomalies: [],
    });
    expect(read?.kind).toBe("manual_warmup");
    expect(read?.kindNote).toBe("Nothing was posted; two accounts were opened and parked.");
    const old = parseReview({ summary: "An older read.", postSeen: null, timeline: [], anomalies: [] });
    expect(old?.kind).toBeNull();
    expect(old?.kindNote).toBe("");
    const odd = parseReview({ summary: "x", kind: "nap", kindNote: 7 });
    expect(odd?.kind).toBeNull();
    expect(odd?.kindNote).toBe("");
  });

  it("calls a session with a matched post 'posting' until a read or a reviewer says otherwise", () => {
    const post = { id: 1, contentType: "cleora", doneAt: null, username: "nikki", platform: "instagram" };
    expect(effectiveKind({ kind: null, kindSetBy: null, matchedPost: post })).toEqual({ kind: "posting", from: "post" });
    expect(effectiveKind({ kind: null, kindSetBy: null, matchedPost: null })).toEqual({ kind: null, from: null });
    expect(effectiveKind({ kind: "other", kindSetBy: "reviewer", matchedPost: post })).toEqual({ kind: "other", from: "reviewer" });
    expect(effectiveKind({ kind: "manual_warmup", kindSetBy: "claude", matchedPost: null })).toEqual({ kind: "manual_warmup", from: "claude" });
  });

  it("has a plain label for each kind", () => {
    expect(KIND_LABEL).toEqual({ posting: "Posting", manual_warmup: "Manual warmup", other: "Other" });
  });
});
