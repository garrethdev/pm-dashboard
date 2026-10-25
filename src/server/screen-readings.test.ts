import { describe, expect, it } from "vitest";
import { captionKey, costOf, curveOrNull, intOrNull, namedPctOrNull, numOrNull, parseRunRequest, parseScreenLinks, pickPost, pickPostByTime, promptFor, screenClock, rateSignalsOrNull, storagePath, toRow } from "./screen-readings";

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

describe("parseRunRequest", () => {
  it("accepts the robot's shape and fills the defaults", () => {
    const r = parseRunRequest({ posts: [{ platform: "tiktok", account: "a", caption: " hi ", screenshots: ["x.png", " y.png "] }] });
    expect(r.read_by).toBe("robot");
    expect(r.posts[0]).toEqual({ platform: "tiktok", account: "a", caption: "hi", posted_at_text: null, post_url: null, screenshots: ["x.png", "y.png"], problem: null });
  });
  it("takes a post with a problem and no screenshots, but not one with neither", () => {
    expect(parseRunRequest({ posts: [{ platform: "facebook", account: "a", problem: "no View insights button" }] }).posts[0].problem).toBe("no View insights button");
    expect(() => parseRunRequest({ posts: [{ platform: "facebook", account: "a" }] })).toThrow(/no screenshots and no problem/);
  });
  it("refuses what it cannot read, with a plain reason", () => {
    expect(() => parseRunRequest(null)).toThrow(/JSON object/);
    expect(() => parseRunRequest({ posts: [] })).toThrow(/non-empty/);
    expect(() => parseRunRequest({ posts: [{ platform: "youtube", account: "a", screenshots: ["x"] }] })).toThrow(/platform/);
    expect(() => parseRunRequest({ read_by: "cron", posts: [{ platform: "tiktok", account: "a", screenshots: ["x"] }] })).toThrow(/read_by/);
  });
});

describe("captionKey / pickPost", () => {
  const posts = [
    { post_id: "1", post_url: "u1", posted_at: "2026-10-16T18:43:40Z", caption_snippet: "The experiment was designed around going without. There was", format: "video" },
    { post_id: "2", post_url: "u2", posted_at: "2026-10-14T18:05:31Z", caption_snippet: "", format: "video" },
    { post_id: "3", post_url: "u3", posted_at: "2026-10-18T19:05:41Z", caption_snippet: "The girl in slide one had no idea what was coming.", format: "carousel" },
    { post_id: "4", post_url: "u4", posted_at: "2026-10-11T19:05:41Z", caption_snippet: "The girl in slide one had no idea what was coming.", format: "carousel" },
  ];
  it("is blind to case, punctuation and emoji", () => {
    expect(captionKey("The 10pm SNACK-raid… 🍪 is not weak")).toBe("the 10pm snack raid is not weak");
  });
  it("matches on the caption's start, either side cut short", () => {
    expect(pickPost(posts, "The experiment was designed around going without.")?.post_id).toBe("1");
    expect(pickPost(posts, "The experiment was designed around going without. There was a cauldron and more words")?.post_id).toBe("1");
  });
  it("uses the date on the screen to tell twins apart, else takes the newest", () => {
    expect(pickPost(posts, "The girl in slide one", "Oct 11, 2026, 3:05 PM")?.post_id).toBe("4");
    expect(pickPost(posts, "The girl in slide one")?.post_id).toBe("3");
  });
  it("gives nothing for no caption, an empty stored caption, or no match", () => {
    expect(pickPost(posts, "")).toBeNull();
    expect(pickPost(posts, "Something else entirely")).toBeNull();
    expect(pickPost(posts, "The")).toBeNull();
  });
  it("with no caption, matches TikTok's \"Posted on\" by the minute, whatever the phone's time zone (phone 1: Phoenix)", () => {
    expect(screenClock("Posted on Oct 16, 2026, 11:43 AM")).toBe(Date.UTC(2026, 9, 16, 11, 43));
    expect(screenClock("Oct 16, 2026, 12:05 AM")).toBe(Date.UTC(2026, 9, 16, 0, 5));
    expect(screenClock("Oct 16, 11:43 AM")).toBeNull();
    // Stored 18:43:40 UTC, shown 11:43 AM in Phoenix.
    expect(pickPost(posts, null, "Posted on Oct 16, 2026, 11:43 AM")?.post_id).toBe("1");
    // The same post on a phone set to Manila (UTC+8): 2:43 AM the next day.
    expect(pickPost(posts, null, "Posted on Oct 17, 2026, 2:43 AM")?.post_id).toBe("1");
    // A caption that matches nothing falls back to the time too.
    expect(pickPost(posts, "Thr experlment", "Posted on Oct 16, 2026, 11:43 AM")?.post_id).toBe("1");
    // A minute nobody posted in, or no time at all: nothing.
    expect(pickPost(posts, null, "Posted on Oct 16, 2026, 11:44 AM")).toBeNull();
    expect(pickPost(posts, null, null)).toBeNull();
  });
  it("gives nothing when two posts fit the time on the screen", () => {
    const twins = [
      { post_id: "a", post_url: null, posted_at: "2026-10-16T18:43:10Z", caption_snippet: "One", format: "video" },
      { post_id: "b", post_url: null, posted_at: "2026-10-16T19:43:20Z", caption_snippet: "Two", format: "video" },
    ];
    expect(pickPostByTime(twins, "Posted on Oct 16, 2026, 11:43 AM")).toBeNull();
    expect(pickPostByTime(twins.slice(0, 1), "Posted on Oct 16, 2026, 11:43 AM")?.post_id).toBe("a");
  });
});

describe("parseScreenLinks", () => {
  it("accepts the robot's paths and defaults the type", () => {
    const r = parseScreenLinks({ screens: [{ path: "tiktok/glow.with.becky/2026-10-24/01-overview.jpeg" }, { path: "facebook/Imani_Vaughn/2026-10-24/12-page.png", type: "image/png" }] });
    expect(r).toEqual([
      { path: "tiktok/glow.with.becky/2026-10-24/01-overview.jpeg", type: "image/jpeg" },
      { path: "facebook/Imani_Vaughn/2026-10-24/12-page.png", type: "image/png" },
    ]);
  });
  it("signs nothing outside a post's own folder", () => {
    expect(() => parseScreenLinks({ screens: [{ path: "../phone-sessions/x.jpeg" }] })).toThrow(/must look like/);
    expect(() => parseScreenLinks({ screens: [{ path: "youtube/a/2026-10-24/01-x.jpeg" }] })).toThrow(/must look like/);
    expect(() => parseScreenLinks({ screens: [{ path: "tiktok/a/2026-10-24/01-x.gif" }] })).toThrow(/must look like/);
    expect(() => parseScreenLinks({ screens: [{ path: "tiktok/a/2026-10-24/01-x.jpeg", type: "image/gif" }] })).toThrow(/type/);
  });
  it("refuses an empty list, a repeated path, and too many at once", () => {
    expect(() => parseScreenLinks({ screens: [] })).toThrow(/at least one/);
    const p = { path: "tiktok/a/2026-10-24/01-x.jpeg" };
    expect(() => parseScreenLinks({ screens: [p, p] })).toThrow(/twice/);
    expect(() => parseScreenLinks({ screens: Array.from({ length: 201 }, (_, i) => ({ path: `tiktok/a/2026-10-24/${String(i).padStart(3, "0")}-x.jpeg` })) })).toThrow(/at most 200/);
  });
});
