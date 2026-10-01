import { describe, expect, it } from "vitest";
import { DOWNLOAD_LABEL, mediaKind } from "@/lib/post-media-kind";

describe("mediaKind", () => {
  it("names a carousel's slides, one video and one picture", () => {
    expect(mediaKind(["a/1.png", "a/2.png", "a/3.png"])).toBe("slides");
    expect(mediaKind(["a/final.mp4"])).toBe("video");
    expect(mediaKind(["a/final.mp4?token=x"])).toBe("video");
    expect(mediaKind(["a/cover.jpg"])).toBe("image");
  });

  it("labels the download button by it", () => {
    expect(DOWNLOAD_LABEL[mediaKind(["1.png", "2.png"])].full).toBe("Download slides");
    expect(DOWNLOAD_LABEL[mediaKind(["v.mp4"])].full).toBe("Download video");
  });
});
