import { describe, expect, it } from "vitest";
import { afterFilter, feedFilter } from "./trends";

describe("the feed's page boundary follows the feed's order (PR #31 review item 5)", () => {
  it("uses score, then views, then id", () => {
    expect(afterFilter({ score: 5.42, views: 263013, id: 4570 })).toBe(
      "&or=(total_score.lt.5.42,total_score.is.null,and(total_score.eq.5.42,or(views_normalized.lt.263013,views_normalized.is.null,and(views_normalized.eq.263013,id.gt.4570))))",
    );
  });
  it("reaches the carousels with no score, which sort last", () => {
    expect(afterFilter({ score: null, views: 10, id: 7 })).toBe(
      "&and=(total_score.is.null,or(views_normalized.lt.10,views_normalized.is.null,and(views_normalized.eq.10,id.gt.7)))",
    );
    expect(afterFilter({ score: null, views: null, id: 7 })).toBe("&and=(total_score.is.null,and(views_normalized.is.null,id.gt.7))");
  });
});

describe("the feed's niche split (outlier radar, 2026-10-31)", () => {
  it("keeps radar finds from other niches out of the main feed, and untagged carousels in", () => {
    expect(feedFilter(null, "main")).toBe("&and=(or(niche_tags.is.null,niche_tags.not.cs.{other_niches}))");
  });
  it("shows only other-niche finds on the Other niches tab", () => {
    expect(feedFilter(null, "other")).toBe("&and=(niche_tags.cs.{other_niches})");
  });
  it("folds the page boundary into the same filter", () => {
    expect(feedFilter({ score: null, views: null, id: 7 }, "other")).toBe(
      "&and=(niche_tags.cs.{other_niches},and(total_score.is.null,and(views_normalized.is.null,id.gt.7)))",
    );
  });
});
