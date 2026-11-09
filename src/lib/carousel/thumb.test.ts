import { afterEach, describe, expect, it, vi } from "vitest";
import { thumbUrl } from "./thumb";

describe("thumbUrl with copies on Cloudflare", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("sends library and Trends pictures to the copy, at 540 or 1080", () => {
    vi.stubEnv("NEXT_PUBLIC_PICTURE_COPIES_URL", "https://img.example.com/");
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/rich-life-images/character-6/a b.jpg", 120)).toBe("https://img.example.com/540/rich-life-images/character-6/a%20b.jpg");
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/reference-slides/4313/2.webp", 540)).toBe("https://img.example.com/540/reference-slides/4313/2.webp");
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/reference-slides/4313/cover.jpg", 1080)).toBe("https://img.example.com/1080/reference-slides/4313/cover.jpg");
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/rich-life-images/c/a%20b.jpg", 720)).toBe("https://img.example.com/1080/rich-life-images/c/a%20b.jpg");
  });
  it("leaves other buckets on Supabase", () => {
    vi.stubEnv("NEXT_PUBLIC_PICTURE_COPIES_URL", "https://img.example.com");
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/b/p.png", 320)).toContain("/render/image/public/b/p.png?width=320");
  });
});

describe("thumbUrl", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("uses Supabase when no copy address is set", () => {
    vi.stubEnv("NEXT_PUBLIC_PICTURE_COPIES_URL", "");
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/reference-slides/1/2.jpg", 540)).toContain("/render/image/public/reference-slides/1/2.jpg?width=540");
  });
  it("turns a public object link into a sized render link", () => {
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/rich-life-images/character-6/a b.jpg", 320)).toBe("https://x.supabase.co/storage/v1/render/image/public/rich-life-images/character-6/a b.jpg?width=320&quality=70&resize=contain");
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
