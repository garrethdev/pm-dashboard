import { describe, expect, it } from "vitest";
import { initialSlide, mediaUrl, metric, plainText, safeWebUrl, searchSummary, type SearchResponse } from "./presentation";

describe("safe catalog presentation", () => {
  it.each(["javascript:alert(1)", "data:image/svg+xml,bad", "http://example.com/a", "https://user:secret@example.com/", "//example.com/a", null])("rejects unsafe URL %s", value => expect(safeWebUrl(value)).toBeNull());
  it("accepts only known image fields", () => {
    expect(mediaUrl({ public_url: "https://example.com/image.jpg" })).toBe("https://example.com/image.jpg");
    expect(mediaUrl({ html: "<img src=x>" })).toBeNull();
    expect(plainText({ text: "invented" })).toBe("");
    expect(plainText("<script>bad</script>")).toBe("<script>bad</script>"); // React renders this as text.
  });
  it("omits missing metrics but preserves known zero", () => {
    expect(metric(null)).toBeNull(); expect(metric(undefined)).toBeNull(); expect(metric(-1)).toBeNull();
    expect(metric(0)).toBe("0"); expect(metric(1200)).toBe("1.2K");
  });
  it("opens on the actual matched position, not an assumed array offset", () => {
    expect(initialSlide([{ position: 1 }, { position: 3 }], 3)).toBe(1);
    expect(initialSlide([{ position: 1 }], 8)).toBe(0);
  });
  it("does not present a full result page as an exhaustive total", () => {
    const response = { query: "test", results: [{}, {}], pagination: { limit: 2 } } as SearchResponse;
    expect(searchSummary(response)).toBe("The 2 best matches for “test”");
    expect(searchSummary({ ...response, results: [] })).toBe("Nothing matches “test”");
  });
});
