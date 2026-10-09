import { describe, expect, it } from "vitest";
import { toPostRow } from "./account-posts";

const base = {
  post_id: "p",
  post_url: "https://example.com/p",
  posted_at: "2026-10-08T17:36:32Z",
  caption_snippet: "c",
  views: 113,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
};

describe("toPostRow", () => {
  it("keeps an Instagram Reel's skip rate and watch time", () => {
    const r = toPostRow({ ...base, format: "video", reach: 98, skip_rate: "51.5", avg_watch_ms: 4204 }, "instagram");
    expect(r).toMatchObject({ reach: 98, skipRate: 51.5, avgWatchSec: 4.2, follows: null });
  });
  it("hides the skip rate of a post nobody viewed, which Instagram reports as 0%", () => {
    expect(toPostRow({ ...base, format: "video", views: 0, skip_rate: 0 }, "instagram").skipRate).toBeNull();
  });
  it("gives a carousel no watch time, though the ingest stores 0 for it", () => {
    const r = toPostRow({ ...base, format: "carousel", avg_watch_ms: 0, follows: 4, profile_visits: 7 }, "instagram");
    expect(r).toMatchObject({ avgWatchSec: null, follows: 4, profileVisits: 7, skipRate: null });
  });
  it("leaves Facebook's shares and saves empty, and a photo post's views empty", () => {
    const r = toPostRow({ ...base, format: "carousel", views: null }, "facebook");
    expect(r).toMatchObject({ views: null, shares: null, saves: null });
  });
});
