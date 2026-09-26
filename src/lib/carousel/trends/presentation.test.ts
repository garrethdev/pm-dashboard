import { describe, expect, it } from "vitest";
import { initialSlide, mediaUrl, metric, plainText, safeWebUrl, searchSummary, parseCarouselDetail, parseSearchResponse, type SearchResponse } from "./presentation";

describe("safe catalog presentation", () => {
  const response = { query: "hook", mode: "keyword", fallback: null, results: [{ reference: { id: 12 }, matched_media: null, slide_count: 0 }], pagination: { limit: 25, returned: 1, exhaustive: false } };
  it("accepts real zero slide counts and empty successful searches", () => {
    expect(parseSearchResponse(response)).toEqual(response);
    expect(parseSearchResponse({ ...response, results: [], pagination: { ...response.pagination, returned: 0 } }).results).toEqual([]);
  });
  it.each([null, {}, { reference: null, slide_count: 1 }, { reference: { id: "../1" }, slide_count: 1 }, { reference: { id: "9007199254740992" }, slide_count: 1 }, { reference: { id: 1 }, slide_count: -1 }])("rejects corrupt search rows", item => {
    expect(() => parseSearchResponse({ ...response, results: [item] })).toThrow("Unexpected search response");
  });
  it("rejects count inconsistencies rather than presenting misleading totals", () => {
    expect(() => parseSearchResponse({ ...response, pagination: { ...response.pagination, returned: 0 } })).toThrow();
    expect(() => parseSearchResponse({ ...response, pagination: { ...response.pagination, limit: 0 } })).toThrow();
  });
  it("retains partial and unread detail records", () => {
    const detail = { reference: { id: 1 }, slides: [], documents: [], analysis: null, reading_required: true };
    expect(parseCarouselDetail(detail)).toEqual(detail);
    expect(parseCarouselDetail({ ...detail, analysis: { inspection_status: "partial" }, reading_required: false }).analysis?.inspection_status).toBe("partial");
  });
  it.each([{ reference: [] }, { slides: [null] }, { slides: ["slide"] }, { documents: [null] }, { analysis: [] }, { reading_required: "false" }])("rejects malformed detail fields %j", patch => {
    expect(() => parseCarouselDetail({ reference: {}, slides: [], documents: [], analysis: null, reading_required: true, ...patch })).toThrow("Unexpected detail response");
  });
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
