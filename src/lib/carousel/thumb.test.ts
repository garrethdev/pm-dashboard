import { describe, expect, it } from "vitest";
import { thumbUrl } from "./thumb";

describe("thumbUrl", () => {
  it("turns a public object link into a sized render link", () => {
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/rich-life-images/character-6/a b.jpg", 320)).toBe("https://x.supabase.co/storage/v1/render/image/public/rich-life-images/character-6/a b.jpg?width=320&quality=70&resize=cover");
  });
  it("clamps the width and rounds it", () => {
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/b/p.png", 10)).toContain("width=64");
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/b/p.png", 9000)).toContain("width=1600");
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/b/p.png", 333.4)).toContain("width=333");
  });
  it("leaves other links and signed links alone", () => {
    expect(thumbUrl("https://p16-sign.tiktokcdn.com/x.jpeg?expires=1")).toBe("https://p16-sign.tiktokcdn.com/x.jpeg?expires=1");
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/sign/b/p.png?token=abc")).toBe("https://x.supabase.co/storage/v1/object/sign/b/p.png?token=abc");
    expect(thumbUrl(null)).toBeNull();
    expect(thumbUrl("")).toBeNull();
  });
});
