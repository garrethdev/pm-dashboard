import { describe, expect, it } from "vitest";
import { totalReach, weightedSkipRate } from "./account-analytics";

const row = (views: number | null, skip_rate: number | string | null, reach: number | null = null) => ({
  post_id: "p",
  post_url: "",
  posted_at: "2026-10-08T00:00:00Z",
  caption_snippet: null,
  views,
  likes: 0,
  comments: 0,
  total_engagement: 0,
  ingested_at: null,
  skip_rate,
  reach,
});

describe("weightedSkipRate", () => {
  it("weights each post by its views, so one viewer cannot swing the account", () => {
    // 113 views at 51.5% and 1 view at 100%: a plain average says 75.8%.
    expect(weightedSkipRate([row(113, 51.5), row(1, 100)])).toBe(51.9);
  });
  it("reads the number PostgREST may send as text", () => {
    expect(weightedSkipRate([row(10, "40")])).toBe(40);
  });
  it("is empty, not 0, when no post has a skip rate (carousels, other platforms)", () => {
    expect(weightedSkipRate([row(50, null)])).toBeNull();
    expect(weightedSkipRate([row(0, 0)])).toBeNull();
  });
});

describe("totalReach", () => {
  it("adds up the posts that have reach and is empty when none does", () => {
    expect(totalReach([row(5, null, 4), row(3, null, 3), row(1, null, null)])).toBe(7);
    expect(totalReach([row(5, null)])).toBeNull();
  });
});
