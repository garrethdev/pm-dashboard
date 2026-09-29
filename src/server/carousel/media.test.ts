import { describe, expect, it } from "vitest";
import { displayUrl, isExpired, isHeic } from "./media";

const live = "https://p16-common-sign.tiktokcdn-us.com/tos-x/abc~tplv-photomode-shrink-v1:1080:0:q80.heic?x-expires=1791522000&x-signature=s";
const dead = "https://p16-common-sign.tiktokcdn-us.com/tos-x/abc~tplv-photomode-shrink-v1:1080:0:q80.heic?x-expires=1790373600&x-signature=s";
const now = Date.parse("2026-09-26T12:00:00Z");

describe("slide images the browser can show", () => {
  it("routes a live HEIC slide through the converter", () => {
    expect(isHeic(live)).toBe(true);
    expect(displayUrl(live, now)).toBe(`/api/carousel-generator/image?src=${encodeURIComponent(live)}`);
  });
  it("treats an expired TikTok link as no image", () => {
    expect(isExpired(dead, now)).toBe(true);
    expect(displayUrl(dead, now)).toBeNull();
  });
  it("leaves durable links alone", () => {
    const virlo = "https://auth.virlo.ai/storage/v1/object/public/slideshow-images/x.webp";
    expect(displayUrl(virlo, now)).toBe(virlo);
    expect(isExpired(virlo, now)).toBe(false);
  });
  it("does not convert HEIC from a host it does not know", () => {
    expect(displayUrl("https://example.com/a.heic", now)).toBe("https://example.com/a.heic");
  });
});
