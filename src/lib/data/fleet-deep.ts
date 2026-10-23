/**
 * DA-10: the Deep side of the main Analytics page, the deep numbers across
 * the whole fleet (docs/DEEP-ANALYTICS-TICKETS.md). Direction (Garreth,
 * 2026-10-23): the same Overview / Deep switch as the account page, in the
 * same place; grouped by character and content type, not by hook alone,
 * because hook types are only partly shared across lanes.
 *
 * DESIGN STEP. This file holds the shape the screen is drawn against and a
 * made-up sample, as every design in this project is drawn. The real loader
 * is the build step after the screen is approved and after DA-07's first
 * weeks have given it readings to rest on.
 *
 * Empty is not 0: a number nobody has yet is null and shows as a dash.
 */
import type { Audience, CurvePoint, NamedPct, WeekValue } from "@/lib/data/account-deep";

/** How long people watch, for one slice of the fleet (the whole, or one content type). */
export interface FleetWatchingRow {
  contentType: string;
  character: string;
  readPosts: number;
  avgWatchSec: number | null;
  watchedFullPct: number | null;
  heldPct: number | null;
  dropOffSec: number | null;
}

export interface FleetWatching {
  readPosts: number;
  avgWatchSec: number | null;
  watchedFullPct: number | null;
  heldPct: number | null;
  dropOffSec: number | null;
  curve: CurvePoint[];
  weekly: { avgWatchSec: WeekValue[]; watchedFullPct: WeekValue[]; heldPct: WeekValue[]; dropOffSec: WeekValue[] };
  /** One row per content type with readings, best first. */
  byContentType: FleetWatchingRow[];
}

export interface FleetForYou {
  videosRead: number;
  held: number;
  /** Per TikTok account: how many of its read videos were held. */
  byAccount: { account: string; held: number; videosRead: number }[];
}

/** One hook family inside one content type. */
export interface FleetHookRow {
  family: string;
  posts: number;
  medianViews: number | null;
  heldPct: number | null;
  followsPer100: number | null;
}

export interface FleetHookGroup {
  contentType: string;
  character: string;
  taggedPosts: number;
  rows: FleetHookRow[];
}

/** A hook family from the shared list, compared across every lane that uses it. */
export interface SharedHookRow {
  family: string;
  posts: number;
  contentTypes: number;
  medianViews: number | null;
  heldPct: number | null;
}

export interface FleetHookPost {
  postUrl: string | null;
  hookText: string;
  family: string;
  account: string;
  contentType: string;
  postedAt: string;
  views: number | null;
  heldPct: number | null;
}

export interface FleetDeep {
  asOf: string;
  totalPosts: number;
  taggedPosts: number;
  readPosts: number;
  accountsRead: number;
  watching: FleetWatching | null;
  sources: { readPosts: number; items: NamedPct[] } | null;
  audience: Audience | null;
  forYou: FleetForYou | null;
  hooksByContentType: FleetHookGroup[];
  sharedHooks: SharedHookRow[];
  best: FleetHookPost[];
  worst: FleetHookPost[];
}

const WEEKS = ["Sep 29", "Oct 6", "Oct 13", "Oct 20"];
const weekly = (values: (number | null)[]): WeekValue[] => values.map((value, i) => ({ week: WEEKS[i] ?? "", value }));

/** Made-up numbers for drawing the screen: four characters, seven content types, a month of Fridays. */
export const SAMPLE_FLEET_DEEP: FleetDeep = {
  asOf: "2026-11-14",
  totalPosts: 312,
  taggedPosts: 287,
  readPosts: 164,
  accountsRead: 11,
  watching: {
    readPosts: 164,
    avgWatchSec: 4.6,
    watchedFullPct: 17,
    heldPct: 54,
    dropOffSec: 2,
    curve: [
      { s: 0, pct: 100 }, { s: 1, pct: 79 }, { s: 2, pct: 61 }, { s: 3, pct: 54 }, { s: 4, pct: 48 }, { s: 5, pct: 44 },
      { s: 6, pct: 40 }, { s: 8, pct: 34 }, { s: 10, pct: 29 }, { s: 12, pct: 26 }, { s: 15, pct: 23 }, { s: 18, pct: 21 },
      { s: 21, pct: 19 }, { s: 24, pct: 18 }, { s: 27, pct: 17 }, { s: 30, pct: 17 },
    ],
    weekly: {
      avgWatchSec: weekly([4.1, 4.3, 4.4, 4.6]),
      watchedFullPct: weekly([14, 15, 16, 17]),
      heldPct: weekly([49, 51, 52, 54]),
      dropOffSec: weekly([1, 2, 2, 2]),
    },
    byContentType: [
      { contentType: "Viral theories", character: "Character 6", readPosts: 31, avgWatchSec: 6.2, watchedFullPct: 24, heldPct: 63, dropOffSec: 3 },
      { contentType: "Cleora stories", character: "Character 5", readPosts: 44, avgWatchSec: 5.1, watchedFullPct: 19, heldPct: 58, dropOffSec: 2 },
      { contentType: "Journey, 3 slides", character: "Character 6", readPosts: 27, avgWatchSec: null, watchedFullPct: null, heldPct: 55, dropOffSec: null },
      { contentType: "Cleora ASMR", character: "Character 5", readPosts: 22, avgWatchSec: 3.9, watchedFullPct: 12, heldPct: 47, dropOffSec: 1 },
      { contentType: "Divorce recovery", character: "Character 4", readPosts: 18, avgWatchSec: 3.4, watchedFullPct: 9, heldPct: 41, dropOffSec: 1 },
      { contentType: "Filler", character: "Character 2", readPosts: 22, avgWatchSec: 2.8, watchedFullPct: 7, heldPct: 36, dropOffSec: 1 },
    ],
  },
  sources: {
    readPosts: 164,
    items: [
      { name: "For You / Reels tab", pct: 58.4 },
      { name: "Explore", pct: 14.2 },
      { name: "Feed", pct: 11.7 },
      { name: "Profile", pct: 7.9 },
      { name: "Stories", pct: 4.6 },
      { name: "Search", pct: 3.2 },
    ],
  },
  audience: {
    readPosts: 164,
    followersPct: 9.1,
    newViewersPct: 71,
    age: [
      { name: "13-17", pct: 2.4 }, { name: "18-24", pct: 22.8 }, { name: "25-34", pct: 37.1 },
      { name: "35-44", pct: 21.9 }, { name: "45-54", pct: 10.2 }, { name: "55-64", pct: 4.1 }, { name: "65+", pct: 1.5 },
    ],
    country: [
      { name: "United States", pct: 46.2 }, { name: "India", pct: 12.9 }, { name: "United Kingdom", pct: 8.4 },
      { name: "Canada", pct: 6.1 }, { name: "Australia", pct: 4.7 },
    ],
    gender: [{ name: "Women", pct: 68.3 }, { name: "Men", pct: 31.7 }],
  },
  forYou: {
    videosRead: 71,
    held: 6,
    byAccount: [
      { account: "glow.with.becky", held: 3, videosRead: 19 },
      { account: "alicia_glow3", held: 2, videosRead: 21 },
      { account: "amelia.brown015", held: 1, videosRead: 14 },
      { account: "kathy.spd", held: 0, videosRead: 17 },
    ],
  },
  hooksByContentType: [
    {
      contentType: "Cleora stories",
      character: "Character 5",
      taggedPosts: 68,
      rows: [
        { family: "surprising fact", posts: 24, medianViews: 212, heldPct: 63, followsPer100: 2.1 },
        { family: "curiosity gap", posts: 21, medianViews: 141, heldPct: 56, followsPer100: 1.4 },
        { family: "question", posts: 14, medianViews: 118, heldPct: 52, followsPer100: 1.1 },
        { family: "talking to", posts: 9, medianViews: 64, heldPct: 44, followsPer100: 0.6 },
      ],
    },
    {
      contentType: "Journey, 3 slides",
      character: "Character 6",
      taggedPosts: 54,
      rows: [
        { family: "declaration", posts: 23, medianViews: 97, heldPct: 57, followsPer100: 1.8 },
        { family: "talking to the weight", posts: 19, medianViews: 71, heldPct: 49, followsPer100: 0.9 },
        { family: "question", posts: 12, medianViews: 133, heldPct: 61, followsPer100: 2.3 },
      ],
    },
    {
      contentType: "Viral theories",
      character: "Character 6",
      taggedPosts: 41,
      rows: [
        { family: "surprising fact", posts: 25, medianViews: 388, heldPct: 66, followsPer100: 2.7 },
        { family: "contrarian", posts: 16, medianViews: 204, heldPct: 59, followsPer100: 1.9 },
      ],
    },
    {
      contentType: "Divorce recovery",
      character: "Character 4",
      taggedPosts: 29,
      rows: [
        { family: "relatable", posts: 17, medianViews: 58, heldPct: 43, followsPer100: 0.7 },
        { family: "personal story", posts: 12, medianViews: 81, heldPct: 46, followsPer100: 1.0 },
      ],
    },
  ],
  sharedHooks: [
    { family: "surprising fact", posts: 49, contentTypes: 2, medianViews: 301, heldPct: 64 },
    { family: "question", posts: 26, contentTypes: 2, medianViews: 124, heldPct: 56 },
    { family: "curiosity gap", posts: 21, contentTypes: 1, medianViews: 141, heldPct: 56 },
    { family: "relatable", posts: 17, contentTypes: 1, medianViews: 58, heldPct: 43 },
    { family: "personal story", posts: 12, contentTypes: 1, medianViews: 81, heldPct: 46 },
    { family: "talking to", posts: 9, contentTypes: 1, medianViews: 64, heldPct: 44 },
  ],
  best: [
    { postUrl: "https://www.tiktok.com/@sample/video/1", hookText: "The zombie skin cells that make you look older", family: "surprising fact", account: "hey.imani.vaughn", contentType: "Cleora stories", postedAt: "2026-11-06T18:00:00Z", views: 1240, heldPct: 74 },
    { postUrl: "https://www.instagram.com/p/sample2/", hookText: "Nobody told me the 3pm crash was a sleep problem", family: "surprising fact", account: "trina_triumphs", contentType: "Viral theories", postedAt: "2026-11-02T19:05:00Z", views: 611, heldPct: 71 },
    { postUrl: "https://www.tiktok.com/@sample/video/3", hookText: "What would you do with the energy back?", family: "question", account: "glow.with.becky", contentType: "Journey, 3 slides", postedAt: "2026-11-09T14:40:00Z", views: 428, heldPct: 68 },
    { postUrl: "https://www.instagram.com/p/sample4/", hookText: "The pill they almost binned", family: "curiosity gap", account: "hey.imani.vaughn", contentType: "Cleora stories", postedAt: "2026-10-28T17:10:00Z", views: 377, heldPct: 66 },
    { postUrl: "https://www.tiktok.com/@sample/video/5", hookText: "Day 40. The scale moved before the mirror did", family: "declaration", account: "alicia_glow3", contentType: "Journey, 3 slides", postedAt: "2026-11-04T16:12:00Z", views: 296, heldPct: 64 },
  ],
  worst: [
    { postUrl: "https://www.tiktok.com/@sample/video/6", hookText: "Hear me out, I'm going to lose this weight", family: "talking to the weight", account: "trina_triumphs", contentType: "Journey, 3 slides", postedAt: "2026-11-03T19:05:00Z", views: 53, heldPct: 31 },
    { postUrl: "https://www.instagram.com/p/sample7/", hookText: "When you avoid every photo taken of you", family: "relatable", account: "amelia.brown015", contentType: "Divorce recovery", postedAt: "2026-10-30T16:30:00Z", views: 41, heldPct: 34 },
    { postUrl: "https://www.tiktok.com/@sample/video/8", hookText: "I said it out loud this time", family: "declaration", account: "alicia_glow3", contentType: "Journey, 3 slides", postedAt: "2026-11-07T15:55:00Z", views: 67, heldPct: 38 },
    { postUrl: "https://www.instagram.com/p/sample9/", hookText: "Some people will say I did it on my own", family: "personal story", account: "trina_triumphs", contentType: "Divorce recovery", postedAt: "2026-11-01T12:00:00Z", views: 111, heldPct: 39 },
    { postUrl: "https://www.tiktok.com/@sample/video/10", hookText: "fix the sleep and the snacking mostly fixes itself", family: "talking to", account: "kathy.spd", contentType: "Cleora ASMR", postedAt: "2026-11-10T11:00:00Z", views: 30, heldPct: 40 },
  ],
};
