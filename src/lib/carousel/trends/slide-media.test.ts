import { expect, it } from "vitest";
import { attachSlideMedia } from "./slide-media";
const slides = [{ id: "one", position: 1 }, { id: "two", position: 2 }];
it("aligns saved URLs by position with provenance without mutating beats", () => {
  const result = attachSlideMedia(slides, { id: "evidence", media_urls: ["https://example.com/1.jpg", "https://example.com/2.jpg"] });
  expect(result[1]).toMatchObject({ position: 2, media: { url: "https://example.com/2.jpg" }, media_source: { id: "evidence", position: 2 } });
  expect(slides[1]).not.toHaveProperty("media");
});
it.each([undefined, [], ["https://example.com/1.jpg"], ["javascript:bad", "https://example.com/2.jpg"], ["https://example.com/1.jpg", "https://example.com/1.jpg"], [{ url: "https://example.com/1.jpg" }, "https://example.com/2.jpg"]])("does not shift or guess invalid media %j", media_urls => {
  expect(attachSlideMedia(slides, { media_urls })).toBe(slides);
});
it("rejects missing, duplicate or out-of-order positions", () => {
  const evidence = { media_urls: ["https://example.com/1.jpg", "https://example.com/2.jpg"] };
  for (const positions of [[1, 3], [2, 1], [1, 1]]) {
    const rows = positions.map(position => ({ position }));
    expect(attachSlideMedia(rows, evidence)).toBe(rows);
  }
});
