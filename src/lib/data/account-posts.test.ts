import { describe, expect, it } from "vitest";
import { latestByPost, type RawReading, toPostRow, withReading } from "./account-posts";

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

describe("withReading", () => {
  const row = toPostRow({ ...base, format: "video" }, "tiktok");
  const reading = {
    post_url: "https://example.com/p",
    read_at: "2026-10-23T07:20:53Z",
    avg_watch_s: "4.7",
    watched_full_pct: "19.05",
    total_watch_s: 97,
    new_followers: 0,
    viewers: 8,
    views_facebook: null,
    traffic_sources: { "Reels tab": 71.9, Explore: 18.2 },
    fyp_restricted: true,
  };
  it("lays the screen reading's numbers on the post", () => {
    const r = withReading(row, reading);
    expect(r).toMatchObject({ avgWatchSec: 4.7, fullPct: 19.05, totalWatchSec: 97, newFollowers: 0, reach: 8, fypRestricted: true, readAt: reading.read_at });
    expect(r.topSourceName).toBe("Reels tab");
    expect(r.topSourcePct).toBe(71.9);
  });
  it("keeps the API's number when it has one, and fills only what the API never had", () => {
    const ig = toPostRow({ ...base, format: "video", reach: 113, avg_watch_ms: 5709 }, "instagram");
    const r = withReading(ig, { ...reading, avg_watch_s: 5, viewers: 114 });
    expect(r.avgWatchSec).toBe(5.7);
    expect(r.reach).toBe(113);
  });
  it("leaves a post without a reading untouched, and a hidden list empty", () => {
    expect(withReading(row, undefined)).toBe(row);
    const r = withReading(row, { ...reading, traffic_sources: null, fyp_restricted: null });
    expect(r.topSourceName).toBeNull();
    expect(r.fypRestricted).toBeNull();
  });
});

describe("latestByPost", () => {
  it("keeps the first row per post from a newest-first list", () => {
    const a = { post_url: "u", read_at: "2026-10-24T00:00:00Z" } as RawReading;
    const b = { post_url: "u", read_at: "2026-10-17T00:00:00Z" } as RawReading;
    const c = { post_url: null, read_at: "2026-10-24T00:00:00Z" } as RawReading;
    expect(latestByPost([a, b, c]).get("u")).toBe(a);
    expect(latestByPost([a, b, c]).size).toBe(1);
  });
});
