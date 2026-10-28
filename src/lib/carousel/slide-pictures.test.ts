import { describe, expect, it } from "vitest";
import { slidePicture } from "./slide-pictures";

const media = "https://x.supabase.co/storage/v1/object/public/reference-slides/4313/2.webp";

describe("slidePicture", () => {
  it("draws the slides the person has reached, as resized copies", () => {
    expect(slidePicture(media, 0, 0, 540)).toBe("https://x.supabase.co/storage/v1/render/image/public/reference-slides/4313/2.webp?width=540&quality=70&resize=cover");
    expect(slidePicture(media, 2, 2, 540)).toContain("width=540");
    expect(slidePicture(media, 1, 3, 540)).toContain("render/image");
  });
  it("leaves a slide not yet swiped to empty", () => {
    expect(slidePicture(media, 1, 0, 540)).toBeNull();
    expect(slidePicture(media, 5, 4, 540)).toBeNull();
  });
  it("has nothing to draw when the picture is gone", () => {
    expect(slidePicture(null, 0, 0, 540)).toBeNull();
  });
});
