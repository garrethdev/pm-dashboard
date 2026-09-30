import { describe, expect, it } from "vitest";
import { afterFilter } from "./trends";

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
