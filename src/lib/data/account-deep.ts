/**
 * DA-09: the Deep side of an account's analytics, where the numbers start to
 * answer questions (docs/DEEP-ANALYTICS-TICKETS.md). Direction (Garreth,
 * 2026-10-23): not a new page but a switch on the account's analytics,
 * Overview on one side and Deep on the other.
 *
 * DESIGN STEP. This file holds the shape the screen is drawn against and a
 * made-up sample, as every design in this project is drawn (never live data).
 * The real loader, joining content_tags (DA-03), the performance tables
 * (DA-01) and post_screen_readings (DA-08), is the build step after the
 * screen is approved.
 *
 * Empty is not 0: a number nobody has yet (no reading, no reach) is null and
 * shows as a dash.
 */

export interface HookTypeRow {
  /** The hook family as DA-03 groups it, e.g. "question", "declaration". */
  type: string;
  posts: number;
  medianViews: number | null;
  /** % of viewers still watching past the first 3 seconds (100 − skip rate on Instagram; from the screen reading on TikTok). */
  hookRate: number | null;
  /** Where most viewers stopped, in seconds, from the screen reading. */
  dropOffSec: number | null;
  /** New followers per 100 people reached. */
  followsPer100: number | null;
}

export interface HookPost {
  postUrl: string | null;
  /** The words on slide 1 or the first frame. */
  hookText: string;
  type: string;
  postedAt: string;
  views: number | null;
  hookRate: number | null;
}

export interface CarouselRow {
  type: string;
  posts: number;
  medianReach: number | null;
  savesPer100: number | null;
  sharesPer100: number | null;
  followsPer100: number | null;
}

/** A point on the account's average retention curve: % still watching at second s. */
export interface CurvePoint {
  s: number;
  pct: number;
}

/** One week's value for a tile's small trend line; null when that week had no reading. */
export interface WeekValue {
  week: string;
  value: number | null;
}

/** How long people watch, from the screen readings (DA-08). */
export interface Watching {
  /** Posts with a reading this period; what every number here rests on. */
  readPosts: number;
  avgWatchSec: number | null;
  watchedFullPct: number | null;
  /** % still watching past the first 3 seconds. */
  heldPct: number | null;
  /** The second most viewers stopped at. */
  dropOffSec: number | null;
  /** The average curve over the period's readings. */
  curve: CurvePoint[];
  /** Week by week, for the tiles' trend lines and deltas. */
  weekly: { avgWatchSec: WeekValue[]; watchedFullPct: WeekValue[]; heldPct: WeekValue[]; dropOffSec: WeekValue[] };
}

export interface NamedPct {
  name: string;
  pct: number;
}

/** Who watched, summed over the period's readings. */
export interface Audience {
  readPosts: number;
  followersPct: number | null;
  /** TikTok only: % who had not seen the account before. */
  newViewersPct: number | null;
  age: NamedPct[];
  country: NamedPct[];
  gender: NamedPct[];
}

/** TikTok's For You verdicts this period. */
export interface ForYou {
  videosRead: number;
  held: number;
  heldPosts: { postUrl: string | null; hookText: string; postedAt: string; views: number | null }[];
}

export interface AccountDeep {
  asOf: string;
  /** How many of the period's posts have tags, and how many a screen reading. */
  taggedPosts: number;
  readPosts: number;
  totalPosts: number;
  watching: Watching | null;
  /** Where the views came from, summed over the period's readings. */
  sources: { readPosts: number; items: NamedPct[] } | null;
  audience: Audience | null;
  /** TikTok accounts only. */
  forYou: ForYou | null;
  hooks: HookTypeRow[];
  best: HookPost[];
  worst: HookPost[];
  /** Carousels and photos only; empty on an account that posts none. */
  carousels: CarouselRow[];
}

/** Made-up numbers for drawing the screen. Shaped like a Journey account: a few hook families, one month. */
const WEEKS = ["Sep 29", "Oct 6", "Oct 13", "Oct 20"];
const weekly = (values: (number | null)[]): WeekValue[] => values.map((value, i) => ({ week: WEEKS[i] ?? "", value }));

export const SAMPLE_DEEP: AccountDeep = {
  asOf: "2026-10-23",
  taggedPosts: 24,
  readPosts: 11,
  totalPosts: 26,
  watching: {
    readPosts: 11,
    avgWatchSec: 5.1,
    watchedFullPct: 19,
    heldPct: 58,
    dropOffSec: 2,
    curve: [
      { s: 0, pct: 100 }, { s: 1, pct: 81 }, { s: 2, pct: 63 }, { s: 3, pct: 58 }, { s: 4, pct: 52 }, { s: 5, pct: 47 },
      { s: 6, pct: 43 }, { s: 8, pct: 37 }, { s: 10, pct: 32 }, { s: 12, pct: 28 }, { s: 15, pct: 25 }, { s: 18, pct: 22 },
      { s: 21, pct: 20 }, { s: 24, pct: 19 }, { s: 27, pct: 19 }, { s: 30, pct: 18 },
    ],
    weekly: {
      avgWatchSec: weekly([4.2, 4.6, 4.4, 5.1]),
      watchedFullPct: weekly([14, 17, 16, 19]),
      heldPct: weekly([49, 55, 53, 58]),
      dropOffSec: weekly([1, 1, 2, 2]),
    },
  },
  sources: {
    readPosts: 11,
    items: [
      { name: "Reels tab", pct: 64.2 },
      { name: "Explore", pct: 17.8 },
      { name: "Feed", pct: 9.1 },
      { name: "Stories", pct: 5.6 },
      { name: "Profile", pct: 3.3 },
    ],
  },
  audience: {
    readPosts: 11,
    followersPct: 12.4,
    newViewersPct: null,
    age: [
      { name: "13-17", pct: 2.1 }, { name: "18-24", pct: 24.6 }, { name: "25-34", pct: 39.8 },
      { name: "35-44", pct: 19.2 }, { name: "45-54", pct: 9.5 }, { name: "55-64", pct: 3.4 }, { name: "65+", pct: 1.4 },
    ],
    country: [
      { name: "United States", pct: 41.3 }, { name: "India", pct: 18.7 }, { name: "United Kingdom", pct: 7.9 },
      { name: "Canada", pct: 5.2 }, { name: "Australia", pct: 4.1 },
    ],
    gender: [{ name: "Women", pct: 71.5 }, { name: "Men", pct: 28.5 }],
  },
  forYou: {
    videosRead: 9,
    held: 2,
    heldPosts: [
      { postUrl: "https://www.tiktok.com/@sample/video/1", hookText: "Five days. Still eating.", postedAt: "2026-10-16T18:43:00Z", views: 10 },
      { postUrl: "https://www.tiktok.com/@sample/video/2", hookText: "The pill they almost binned", postedAt: "2026-10-21T17:10:00Z", views: 51 },
    ],
  },
  hooks: [
    { type: "question", posts: 7, medianViews: 184, hookRate: 61, dropOffSec: 4, followsPer100: 1.8 },
    { type: "declaration", posts: 6, medianViews: 121, hookRate: 48, dropOffSec: 2, followsPer100: 0.9 },
    { type: "talking to the weight", posts: 5, medianViews: 97, hookRate: 43, dropOffSec: 1, followsPer100: 0.4 },
    { type: "surprising fact", posts: 4, medianViews: 212, hookRate: 66, dropOffSec: null, followsPer100: 2.3 },
    { type: "relatable", posts: 2, medianViews: 58, hookRate: null, dropOffSec: null, followsPer100: null },
  ],
  best: [
    { postUrl: "https://www.instagram.com/p/sample1/", hookText: "Nobody told me the 3pm crash was a sleep problem", type: "surprising fact", postedAt: "2026-10-18T19:05:00Z", views: 341, hookRate: 71 },
    { postUrl: "https://www.instagram.com/p/sample2/", hookText: "What would you do with the energy back?", type: "question", postedAt: "2026-10-14T18:40:00Z", views: 228, hookRate: 68 },
    { postUrl: "https://www.instagram.com/p/sample3/", hookText: "Day 40. The scale moved before the mirror did", type: "declaration", postedAt: "2026-10-09T17:12:00Z", views: 196, hookRate: 63 },
  ],
  worst: [
    { postUrl: "https://www.instagram.com/p/sample4/", hookText: "Hear me out, I'm going to lose this weight", type: "talking to the weight", postedAt: "2026-10-18T19:05:00Z", views: 53, hookRate: 31 },
    { postUrl: "https://www.instagram.com/p/sample5/", hookText: "When you avoid every photo taken of you", type: "relatable", postedAt: "2026-10-11T16:30:00Z", views: 41, hookRate: 34 },
    { postUrl: "https://www.instagram.com/p/sample6/", hookText: "I said it out loud this time", type: "declaration", postedAt: "2026-10-04T15:55:00Z", views: 67, hookRate: 38 },
  ],
  carousels: [
    { type: "question", posts: 5, medianReach: 92, savesPer100: 4.3, sharesPer100: 1.1, followsPer100: 2.2 },
    { type: "surprising fact", posts: 4, medianReach: 140, savesPer100: 6.4, sharesPer100: 2.1, followsPer100: 2.9 },
    { type: "declaration", posts: 4, medianReach: 61, savesPer100: 1.6, sharesPer100: 0.0, followsPer100: 0.8 },
    { type: "talking to the weight", posts: 3, medianReach: 18, savesPer100: 0.0, sharesPer100: null, followsPer100: null },
  ],
};
