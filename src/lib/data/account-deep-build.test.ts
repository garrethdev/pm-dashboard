import { describe, expect, it } from "vitest";
import { averageCurve, averageNamed, buildDeep, curveAt, familyLabel, mean, median, weekOf, type DeepPost, type DeepReading, type DeepTag } from "./account-deep-build";

const blankPost: Omit<DeepPost, "postId" | "postUrl"> = {
  postedAt: "2026-10-18T19:05:00Z",
  format: "video",
  caption: null,
  contentId: null,
  views: null,
  likes: null,
  comments: null,
  shares: null,
  saves: null,
  reach: null,
  skipRate: null,
  follows: null,
};
const blankReading: Omit<DeepReading, "postUrl"> = {
  readAt: "2026-10-23T07:00:00Z",
  viewers: null,
  newFollowers: null,
  avgWatchS: null,
  watchedFullPct: null,
  dropOffS: null,
  retentionCurve: null,
  followersPct: null,
  newViewersPct: null,
  trafficSources: null,
  audienceAge: null,
  audienceCountry: null,
  audienceGender: null,
  fypRestricted: null,
};
const P = (postId: string, extra: Partial<DeepPost> = {}): DeepPost => ({ ...blankPost, postId, postUrl: `https://x/${postId}`, ...extra });
const R = (postId: string, extra: Partial<DeepReading> = {}): DeepReading => ({ ...blankReading, postUrl: `https://x/${postId}`, ...extra });
const T = (contentId: string, hookFamily: string): DeepTag => ({ contentId, hookFamily, hookType: null, hookText: `words of ${contentId}` });

describe("sums", () => {
  it("mean, median, curve reading and week naming", () => {
    expect(mean([1, null, 2])).toBe(1.5);
    expect(median([5, 1, 3, 4])).toBe(3.5);
    expect(median([])).toBeNull();
    const c = [{ s: 0, pct: 100 }, { s: 2, pct: 60 }, { s: 8, pct: 30 }];
    expect(curveAt(c, 3)).toBe(55);
    expect(curveAt(c, 9)).toBeNull();
    expect(weekOf("2026-10-18T19:05:00Z")).toBe("Oct 12");
    expect(familyLabel("talking_to")).toBe("talking to");
  });
  it("averages curves only as far as half of them reach, and named lists over the readings that have one", () => {
    const avg = averageCurve([[{ s: 0, pct: 100 }, { s: 4, pct: 20 }], [{ s: 0, pct: 100 }, { s: 10, pct: 50 }]]);
    expect(avg.find((p) => p.s === 2)?.pct).toBe(75);
    expect(avg[avg.length - 1]!.s).toBe(7);
    expect(averageNamed([{ Feed: 80, Explore: 20 }, { Feed: 40 }, null])).toEqual([{ name: "Feed", pct: 60 }, { name: "Explore", pct: 10 }]);
  });
});

describe("buildDeep", () => {
  const posts = [
    P("a", { contentId: "A", views: 120, reach: 100, skipRate: 40, follows: 2, postedAt: "2026-10-18T10:00:00Z" }),
    P("b", { contentId: "B", views: 80, reach: 50, skipRate: 60, follows: 0, postedAt: "2026-10-11T10:00:00Z" }),
    P("c", { contentId: "C", views: 30, reach: 20, skipRate: 70, postedAt: "2026-10-04T10:00:00Z", format: "carousel", saves: 2, shares: 1 }),
    P("d", { views: 5, skipRate: 0 }),
  ];
  const tags = [T("A", "question"), T("B", "question"), T("C", "declaration")];
  const readings = [
    R("a", { avgWatchS: 5, watchedFullPct: 20, dropOffS: 2, retentionCurve: [{ s: 0, pct: 100 }, { s: 3, pct: 70 }, { s: 10, pct: 30 }], trafficSources: { "Reels tab": 70, Explore: 30 }, followersPct: 10, audienceGender: { Women: 60, Men: 40 } }),
    R("b", { avgWatchS: 3, watchedFullPct: 10, dropOffS: 1, retentionCurve: [{ s: 0, pct: 100 }, { s: 3, pct: 50 }, { s: 10, pct: 20 }], trafficSources: { "Reels tab": 50, Feed: 50 } }),
    R("b", { readAt: "2026-10-16T07:00:00Z", avgWatchS: 99 }),
  ];

  it("groups the hooks by family with the reading's hold where there is one and Instagram's skip rate where not", () => {
    const deep = buildDeep(posts, tags, readings, "instagram");
    expect(deep.totalPosts).toBe(4);
    expect(deep.taggedPosts).toBe(3);
    expect(deep.readPosts).toBe(2);
    const q = deep.hooks.find((h) => h.type === "question")!;
    expect(q.posts).toBe(2);
    expect(q.medianViews).toBe(100);
    expect(q.hookRate).toBe(60);
    expect(q.dropOffSec).toBe(1.5);
    expect(q.followsPer100).toBe(1.3);
    expect(deep.hooks.find((h) => h.type === "declaration")!.hookRate).toBe(30);
  });
  it("takes the newest reading per post and sums the watching from the readings only", () => {
    const w = buildDeep(posts, tags, readings, "instagram").watching!;
    expect(w.readPosts).toBe(2);
    expect(w.avgWatchSec).toBe(4);
    expect(w.heldPct).toBe(60);
    expect(w.curve[0]).toEqual({ s: 0, pct: 100 });
    expect(w.weekly.avgWatchSec.map((x) => x.value)).toEqual([3, 5]);
  });
  it("ranks the best and worst hooks and judges carousels per 100 reached", () => {
    const deep = buildDeep(posts, tags, readings, "instagram");
    expect(deep.best[0]!.hookText).toBe("words of A");
    expect(deep.worst[0]!.hookText).toBe("words of C");
    expect(deep.carousels).toEqual([{ type: "declaration", posts: 1, medianReach: 20, savesPer100: 10, sharesPer100: 5, followsPer100: null }]);
    expect(deep.sources).toEqual({ readPosts: 2, items: [{ name: "Reels tab", pct: 60 }, { name: "Explore", pct: 15 }, { name: "Feed", pct: 25 }].sort((a, b) => b.pct - a.pct) });
    expect(deep.audience?.gender).toEqual([{ name: "Women", pct: 60 }, { name: "Men", pct: 40 }]);
    expect(deep.forYou).toBeNull();
  });
  it("gives nulls and empty lists, never zeros, for an account with nothing", () => {
    const deep = buildDeep([P("z")], [], [], "tiktok");
    expect(deep).toMatchObject({ taggedPosts: 0, readPosts: 0, watching: null, sources: null, audience: null, forYou: null, hooks: [], best: [], worst: [], carousels: [] });
  });
  it("counts TikTok's For You verdicts from the readings", () => {
    const deep = buildDeep([P("t1", { views: 10 }), P("t2", { views: 50 })], [], [R("t1", { fypRestricted: true }), R("t2", { fypRestricted: false })], "tiktok");
    expect(deep.forYou).toMatchObject({ videosRead: 2, held: 1 });
    expect(deep.forYou!.heldPosts[0]!.postUrl).toBe("https://x/t1");
  });
});
