import { describe, expect, it } from "vitest";
import { costOf, curveOrNull, intOrNull, namedPctOrNull, numOrNull, promptFor, rateSignalsOrNull, storagePath, toRow } from "./screen-readings";

const group = { platform: "instagram" as const, account: "trina_triumphs", postUrl: "https://www.instagram.com/p/x/", format: "carousel" };

describe("numOrNull / intOrNull", () => {
  it("reads numbers, with or without % and commas", () => {
    expect(numOrNull(57)).toBe(57);
    expect(numOrNull("57.0%")).toBe(57);
    expect(numOrNull("1,234")).toBe(1234);
    expect(intOrNull(10)).toBe(10);
  });
  it("keeps empty empty: dashes, words and blanks are null, not 0", () => {
    expect(numOrNull("--")).toBeNull();
    expect(numOrNull("")).toBeNull();
    expect(numOrNull(null)).toBeNull();
    expect(numOrNull(undefined)).toBeNull();
    expect(numOrNull("not enough data")).toBeNull();
    expect(numOrNull(NaN)).toBeNull();
  });
  it("does not store a fraction as a count", () => {
    expect(intOrNull(4.7)).toBeNull();
    expect(intOrNull("4.7")).toBeNull();
  });
});

describe("namedPctOrNull", () => {
  it("turns the AI's list into a name → percent object, in order", () => {
    expect(namedPctOrNull([{ name: "Reels tab", pct: 71.9 }, { name: " Explore ", pct: 18.2 }])).toEqual({ "Reels tab": 71.9, Explore: 18.2 });
  });
  it("is null when the screen hid the list", () => {
    expect(namedPctOrNull(null)).toBeNull();
    expect(namedPctOrNull([])).toBeNull();
    expect(namedPctOrNull([{ name: "-", pct: "-%" }])).toBeNull();
  });
});

describe("curveOrNull", () => {
  it("keeps the points in time order", () => {
    expect(curveOrNull([{ s: 8, pct: 40 }, { s: 0, pct: 100 }, { s: 1, pct: 70 }])).toEqual([
      { s: 0, pct: 100 }, { s: 1, pct: 70 }, { s: 8, pct: 40 },
    ]);
  });
  it("needs at least two readable points to be a curve", () => {
    expect(curveOrNull([{ s: 0, pct: 100 }])).toBeNull();
    expect(curveOrNull([{ s: 0, pct: 100 }, { s: "x", pct: 50 }])).toBeNull();
    expect(curveOrNull(null)).toBeNull();
  });
});

describe("rateSignalsOrNull", () => {
  it("keeps the Lower / Typical / Higher label and drops anything else", () => {
    expect(rateSignalsOrNull([
      { name: "Skip rate", pct: 57, vs_typical: "lower" },
      { name: "Like rate", pct: 2.6, vs_typical: "much higher" },
    ])).toEqual({ "Skip rate": { pct: 57, vs_typical: "lower" }, "Like rate": { pct: 2.6, vs_typical: null } });
  });
});

describe("toRow", () => {
  it("fills every number from the form and keeps empties empty", () => {
    const row = toRow(
      {
        views: 619, views_instagram: 53, views_facebook: 566, viewers: 19, likes: 0, comments: 2,
        profile_visits: 2, new_followers: 0, avg_watch_s: null, skip_rate_pct: "--",
        traffic_sources: [{ name: "Feed", pct: 54.7 }, { name: "Stories", pct: 35.8 }],
        followers_pct: 96.2, fyp_restricted: null, notes: "  ",
      },
      group,
      ["a.jpeg", "b.jpeg"],
    );
    expect(row.views).toBe(619);
    expect(row.views_facebook).toBe(566);
    expect(row.likes).toBe(0);
    expect(row.avg_watch_s).toBeNull();
    expect(row.skip_rate_pct).toBeNull();
    expect(row.shares).toBeNull();
    expect(row.traffic_sources).toEqual({ Feed: 54.7, Stories: 35.8 });
    expect(row.fyp_restricted).toBeNull();
    expect(row.notes).toBeNull();
    expect(row.screenshots).toEqual(["a.jpeg", "b.jpeg"]);
    expect(row.read_by).toBe("manual");
  });
  it("lets what the person knows about the post win over what the AI read", () => {
    const row = toRow({ format: "video" }, group, []);
    expect(row.format).toBe("carousel");
    expect(row.post_url).toBe("https://www.instagram.com/p/x/");
    expect(toRow({ format: "video" }, { platform: "tiktok", account: "a" }, []).format).toBe("video");
    expect(toRow({ format: "story" }, { platform: "tiktok", account: "a" }, []).format).toBeNull();
  });
  it("survives a reply that is not a form at all", () => {
    const row = toRow("nonsense", group, []);
    expect(row.views).toBeNull();
    expect(row.raw).toBe("nonsense");
  });
  it("records the For You banner as a plain yes or no", () => {
    expect(toRow({ fyp_restricted: true }, { platform: "tiktok", account: "a" }, []).fyp_restricted).toBe(true);
    expect(toRow({ fyp_restricted: "yes" }, { platform: "tiktok", account: "a" }, []).fyp_restricted).toBeNull();
  });
});

describe("costOf", () => {
  it("prices the models we try and refuses to guess for others", () => {
    expect(costOf("anthropic/claude-opus-5.5", 1_000_000, 0)).toBe(4);
    expect(costOf("anthropic/claude-haiku-5.5", 10_000, 1_000)).toBe(0.0015);
    expect(costOf("some-other-model", 1, 1)).toBeNull();
  });
});

describe("promptFor / storagePath", () => {
  it("tells each platform's screens apart and always states the empty-is-not-0 rule", () => {
    for (const p of ["tiktok", "instagram", "facebook"] as const) expect(promptFor(p)).toContain("Empty is not 0");
    expect(promptFor("tiktok")).toContain("Inspiration");
    expect(promptFor("facebook")).toContain("Post details");
  });
  it("files screenshots under platform, account and day, numbered in order", () => {
    expect(storagePath({ platform: "tiktok", account: "glow.with.becky" }, new Date("2026-10-23T12:00:00Z"), 0, "WhatsApp Image 2026-10-23 at 3.32.04 AM.jpeg"))
      .toBe("tiktok/glow.with.becky/2026-10-23/01-WhatsApp_Image_2026-10-23_at_3.32.04_AM.jpeg");
  });
});
