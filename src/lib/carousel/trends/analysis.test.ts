import { describe, expect, it } from "vitest";
import { analysisGroups, codeLabel, coverageLabel } from "./analysis";
describe("saved analysis presentation", () => {
  it("omits empty groups rather than inventing content", () => {
    expect(analysisGroups(null)).toEqual([]);
    expect(analysisGroups({ inferred: { audience_response: { themes: [], questions: [] } } })).toEqual([]);
  });
  it("keeps full partial analysis and converts code words", () => {
    const groups = analysisGroups({ inspection_status: "partial", hook_family: "outcome_preview", inferred: { story_structure: "list_with_introduction", first_product_slide: 3 } });
    expect(groups[0].rows).toContainEqual({ label: "Hook", values: ["Outcome preview"] });
    expect(groups[0].rows).toContainEqual({ label: "Product", values: ["First shown on slide 3"] });
    expect(codeLabel("new_unknown_code")).toBe("New unknown code");
  });
  it("renders payoff, reusable pattern and audience text without bookkeeping", () => {
    const groups = analysisGroups({ observed: { secret: "DO NOT SHOW" }, inferred: { payoff: { position: 4, description: "The reveal" }, reusable_pattern: { invariants: ["Keep"], limitations: ["Limit"] }, audience_response: { themes: ["Curiosity"], questions: ["How?"] } } });
    expect(groups.map(g => g.title)).toEqual(["How it works", "Reusable pattern", "Audience response"]);
    expect(groups[0].rows[0].values).toEqual(["Slide 4. The reveal"]);
    expect(JSON.stringify(groups)).not.toContain("DO NOT SHOW");
  });
  it("ignores malformed nested data", () => {
    expect(analysisGroups({ inferred: "bad", topic: {} })).toEqual([]);
  });
  it.each([[2, 3, "2 of 3 slides read"], [3, 3, "All 3 slides read"], [0, 3, "0 of 3 slides read"], [4, 3, null], [null, 3, null]])("reads coverage without guessing", (inspected, supplied, expected) => {
    expect(coverageLabel({ observed: { coverage: { inspected_images: inspected, supplied_images: supplied } } })).toBe(expected);
  });
});
