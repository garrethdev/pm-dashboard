import { describe, expect, it } from "vitest";
import worker from "./index.js";

const env = (have) => ({
  SUPABASE_URL: "https://x.supabase.co",
  COPIES: { get: async (key) => (have.includes(key) ? { body: "webp-bytes", httpEtag: '"e1"' } : null) },
});

describe("picture copies worker", () => {
  it("serves a copy that has been made, from R2", async () => {
    const res = await worker.fetch(new Request("https://img.example.com/540/rich-life-images/character-6/a%20b.jpg"), env(["rich-life-images/character-6/a b.jpg/540.webp"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(await res.text()).toBe("webp-bytes");
  });
  it("sends a picture with no copy yet to Supabase's resizer", async () => {
    const res = await worker.fetch(new Request("https://img.example.com/1080/reference-slides/4313/cover.jpg"), env([]));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://x.supabase.co/storage/v1/render/image/public/reference-slides/4313/cover.jpg?width=1080&quality=70&resize=contain");
  });
  it("answers nothing outside the two buckets and two widths", async () => {
    expect((await worker.fetch(new Request("https://img.example.com/540/other/a.jpg"), env([]))).status).toBe(404);
    expect((await worker.fetch(new Request("https://img.example.com/300/reference-slides/a.jpg"), env([]))).status).toBe(404);
    expect((await worker.fetch(new Request("https://img.example.com/540/reference-slides/a.jpg", { method: "POST" }), env([]))).status).toBe(405);
  });
});
