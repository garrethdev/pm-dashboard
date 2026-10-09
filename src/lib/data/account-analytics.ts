import { ACCOUNT_ANALYTICS_TAG, TTL, cachedFetcher, type Cached } from "@/lib/data/cache";
import { sbRestAll } from "@/lib/data/supabase";
import { resolveThumbnail } from "@/lib/data/top-posts";
import { type AnalyticsPlatform, perfTable } from "@/lib/platform";

/**
 * Analytics for ONE account — the same shapes the fleet page uses, minus every
 * fleet-wide section. This answers "is this account healthy, collapsing or
 * shadowbanned", so it carries its own performance and nothing to compare it
 * against.
 *
 * Aggregated in TypeScript rather than in an RPC, which is the opposite of the
 * fleet page. That is deliberate: analytics_rollup aggregates in Postgres
 * because PostgREST caps a response at 1000 rows and the two perf tables hold
 * ~3.3k between them, so a client-side sum would silently under-report. One
 * account is far below that cap today — the busiest has 203 rows, the average
 * 60 — but the read pages anyway (see rowsFor), because the cap gives no sign
 * when it bites and "we are comfortably under it" is a fact with a shelf life.
 *
 * NOT real-time. Both perf tables are filled by scheduled ingests, so
 * `lastIngest` is the honest "as of" and is rendered beside the range picker.
 */

export type AccountRangeKey = "7d" | "14d" | "30d" | "all";

/** The same four windows the fleet Analytics page offers. */
export const ACCOUNT_RANGES: { key: AccountRangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "14d", label: "2 weeks", days: 14 },
  { key: "30d", label: "1 month", days: 30 },
  { key: "all", label: "All time", days: null },
];

export interface AccountSeriesPoint {
  key: string;
  label: string;
  posts: number;
  views: number;
  avgViews: number;
  /** Engagement as a % of views in this bucket — the 4th tile's sparkline. */
  engagementRate: number;
  /** Instagram only (DA-01); null elsewhere or when no post in the bucket has it. */
  skipRate: number | null;
  reach: number | null;
  follows: number | null;
  profileVisits: number | null;
}

export interface AccountPost {
  postId: string;
  postUrl: string;
  postedAt: string;
  caption: string | null;
  /** Null on a Facebook photo post: Facebook shows nobody but the owner its views. */
  views: number | null;
  likes: number;
  comments: number;
  engagement: number;
  /** Instagram's deeper numbers (DA-01). Null when the post does not have it:
   *  skip rate is Reels only, follows and profile visits carousels and photos
   *  only, and none of the four exists on TikTok or Facebook. */
  reach: number | null;
  skipRate: number | null;
  follows: number | null;
  profileVisits: number | null;
  thumbnailUrl: string | null;
}

export interface AccountAnalytics {
  account: string | null;
  platform: AnalyticsPlatform;
  rangeDays: number | null;
  bucket: "day" | "week";
  lastIngest: string | null;
  summary: {
    posts: number;
    views: number;
    avgViews: number;
    engagement: number;
    engagementRate: number;
    /** % of viewers who swiped away within 3 seconds, weighted by views. Null
     *  off Instagram or when no post in range has one. Lower is better. */
    skipRate: number | null;
    /** People reached, summed over posts. Null off Instagram. */
    reach: number | null;
    /** Follows and profile visits won by posts, summed. Instagram carousels and
     *  photos only, so null on an account whose posts in range are all Reels. */
    follows: number | null;
    profileVisits: number | null;
  };
  /** % change vs the equally-long window before this range; null for All time. */
  deltas: {
    posts: number | null;
    views: number | null;
    avgViews: number | null;
    engagementRate: number | null;
    skipRate: number | null;
    reach: number | null;
    follows: number | null;
    profileVisits: number | null;
  };
  series: AccountSeriesPoint[];
  topPosts: AccountPost[];
  recentPosts: AccountPost[];
}

interface RawRow {
  post_id: string;
  post_url: string;
  posted_at: string;
  caption_snippet: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  total_engagement: number | null;
  ingested_at: string | null;
  // Instagram only (DA-01); absent on the other platforms' rows.
  reach?: number | null;
  skip_rate?: number | string | null;
  follows?: number | null;
  profile_visits?: number | null;
}

const n = (v: number | null | undefined) => Number(v ?? 0);
/** A number the post may not have: kept as null rather than read as 0. */
const maybe = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v));

/**
 * Skip rate across posts, weighted by views. A plain average lets a post seen
 * by one person (and so skipped 0% or 100%) count as much as one seen by a
 * hundred.
 */
export function weightedSkipRate(rows: RawRow[]): number | null {
  let skipped = 0;
  let viewers = 0;
  for (const r of rows) {
    const rate = maybe(r.skip_rate);
    if (rate === null || !n(r.views)) continue;
    skipped += rate * n(r.views);
    viewers += n(r.views);
  }
  return viewers ? Math.round((skipped / viewers) * 10) / 10 : null;
}

/** One of the deeper numbers summed over the posts that have it; null when
 *  none does, so "no carousels this week" never reads as "0 follows". */
function sumGiven(rows: RawRow[], key: "reach" | "follows" | "profile_visits"): number | null {
  const has = rows.filter((r) => r[key] !== null && r[key] !== undefined);
  return has.length ? has.reduce((a, r) => a + n(r[key]), 0) : null;
}

/** Reach summed over the posts that have it; null when none does. */
export function totalReach(rows: RawRow[]): number | null {
  return sumGiven(rows, "reach");
}

/** % change, or null when there is no baseline to compare against. */
function delta(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

/** Day buckets for a short window, week buckets for a long one — the fleet
 *  page's rule, so the two charts read the same way. */
function bucketOf(days: number | null): "day" | "week" {
  return days !== null && days <= 30 ? "day" : "week";
}

function bucketKey(iso: string, bucket: "day" | "week"): string {
  const d = new Date(iso);
  if (bucket === "day") return d.toISOString().slice(0, 10);
  // Monday-anchored week, at UTC so a viewer's timezone cannot shift a post
  // into the neighbouring bucket.
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function bucketLabel(key: string, bucket: "day" | "week"): string {
  const d = new Date(`${key}T00:00:00Z`);
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return bucket === "day" ? md : `w/c ${md}`;
}

/**
 * One account's rows from whichever perf table holds them.
 *
 * Paged, not a plain select. The busiest account holds 203 rows today against
 * PostgREST's 1000-row cap, so nothing is being truncated yet — but the cap is
 * silent when it bites, and "All time" on an account that has been posting for
 * three years is exactly how you would first meet it: no error, just totals
 * that stopped growing. `post_id` breaks ties in the sort so paging cannot
 * repeat or drop a row when two posts share a timestamp.
 */
// Typed to the platforms that have a performance table, so nothing without
// one can fall through to the TikTok table.
async function rowsFor(account: string, platform: AnalyticsPlatform, sinceIso: string | null) {
  const table = perfTable(platform);
  // The deeper numbers exist on the Instagram table only; asking another
  // table for them would fail the whole read.
  const cols =
    "post_id,post_url,posted_at,caption_snippet,views,likes,comments,total_engagement,ingested_at" +
    (platform === "instagram" ? ",reach,skip_rate,follows,profile_visits" : "");
  const since = sinceIso ? `&posted_at=gte.${sinceIso}` : "";
  return sbRestAll<RawRow>(
    `${table}?select=${cols}&account=eq.${encodeURIComponent(account)}${since}` +
      "&order=posted_at.desc,post_id.desc",
  );
}

function summarise(rows: RawRow[]) {
  const posts = rows.length;
  // Averages and rates only over posts that have a view count. A Facebook
  // photo post has none, and counting it as 0 would drag the average down.
  const seen = rows.filter((r) => r.views !== null);
  const views = seen.reduce((a, r) => a + n(r.views), 0);
  const engagement = rows.reduce((a, r) => a + n(r.total_engagement), 0);
  const seenEngagement = seen.reduce((a, r) => a + n(r.total_engagement), 0);
  return {
    posts,
    views,
    engagement,
    avgViews: seen.length ? Math.round(views / seen.length) : 0,
    // Against views, not posts: "how many of the people who saw it reacted".
    engagementRate: views ? Math.round((seenEngagement / views) * 1000) / 10 : 0,
    skipRate: weightedSkipRate(rows),
    reach: totalReach(rows),
    follows: sumGiven(rows, "follows"),
    profileVisits: sumGiven(rows, "profile_visits"),
  };
}

function toPost(r: RawRow, thumb: string | null): AccountPost {
  return {
    postId: r.post_id,
    postUrl: r.post_url,
    postedAt: r.posted_at,
    caption: r.caption_snippet,
    views: r.views === null ? null : n(r.views),
    likes: n(r.likes),
    comments: n(r.comments),
    engagement: n(r.total_engagement),
    reach: maybe(r.reach),
    // With no viewers there is nothing to skip: Instagram reports 0%, which
    // would read as a perfect hook.
    skipRate: n(r.views) ? maybe(r.skip_rate) : null,
    follows: maybe(r.follows),
    profileVisits: maybe(r.profile_visits),
    thumbnailUrl: thumb,
  };
}

async function fetchAccountAnalytics(
  account: string | null,
  platform: AnalyticsPlatform,
  days: number | null,
): Promise<AccountAnalytics> {
  const bucket = bucketOf(days);
  const empty: AccountAnalytics = {
    account,
    platform,
    rangeDays: days,
    bucket,
    lastIngest: null,
    summary: { posts: 0, views: 0, avgViews: 0, engagement: 0, engagementRate: 0, skipRate: null, reach: null, follows: null, profileVisits: null },
    deltas: {
      posts: null,
      views: null,
      avgViews: null,
      engagementRate: null,
      skipRate: null,
      reach: null,
      follows: null,
      profileVisits: null,
    },
    series: [],
    topPosts: [],
    recentPosts: [],
  };
  // A brand-new account has no username yet; there is nothing to query.
  if (!account) return empty;

  const now = Date.now();
  const startIso = days ? new Date(now - days * 86_400_000).toISOString() : null;
  // One window back, for the deltas. Fetched in the same call as the current
  // window rather than as a second round trip.
  const prevStartIso = days ? new Date(now - 2 * days * 86_400_000).toISOString() : null;

  const all = await rowsFor(account, platform, prevStartIso);
  const startMs = startIso ? new Date(startIso).getTime() : -Infinity;
  const current = all.filter((r) => new Date(r.posted_at).getTime() >= startMs);
  const previous = days ? all.filter((r) => new Date(r.posted_at).getTime() < startMs) : [];

  const summary = summarise(current);
  const before = summarise(previous);

  // Series, oldest first so the line reads left to right.
  const byBucket = new Map<
    string,
    { posts: number; seen: number; views: number; engagement: number; rows: RawRow[] }
  >();
  for (const r of current) {
    const k = bucketKey(r.posted_at, bucket);
    const b = byBucket.get(k) ?? { posts: 0, seen: 0, views: 0, engagement: 0, rows: [] };
    b.posts += 1;
    b.rows.push(r);
    // As in summarise: posts with no view count stay out of views and rates.
    if (r.views !== null) {
      b.seen += 1;
      b.views += n(r.views);
      b.engagement += n(r.total_engagement);
    }
    byBucket.set(k, b);
  }
  const series: AccountSeriesPoint[] = [...byBucket.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: bucketLabel(key, bucket),
      posts: v.posts,
      views: v.views,
      avgViews: v.seen ? Math.round(v.views / v.seen) : 0,
      engagementRate: v.views ? Math.round((v.engagement / v.views) * 1000) / 10 : 0,
      skipRate: weightedSkipRate(v.rows),
      reach: totalReach(v.rows),
      follows: sumGiven(v.rows, "follows"),
      profileVisits: sumGiven(v.rows, "profile_visits"),
    }));

  // Top by views, so only posts that have them.
  const top = current.filter((r) => r.views !== null).sort((a, b) => n(b.views) - n(a.views)).slice(0, 5);
  // `current` is already posted_at desc.
  const recent = current.slice(0, 5);

  // One resolve per distinct post — the two lists overlap often, and each miss
  // is an outbound oEmbed call.
  const distinct = [...new Map([...top, ...recent].map((r) => [r.post_id, r])).values()];
  const thumbs = new Map<string, string | null>();
  await Promise.all(
    distinct.map(async (r) => {
      thumbs.set(
        r.post_id,
        await resolveThumbnail({ platform, post_id: r.post_id, post_url: r.post_url }).catch(
          () => null,
        ),
      );
    }),
  );

  return {
    account,
    platform,
    rangeDays: days,
    bucket,
    lastIngest:
      current.reduce<string | null>(
        (max, r) => (r.ingested_at && (!max || r.ingested_at > max) ? r.ingested_at : max),
        null,
      ) ?? null,
    summary,
    deltas: {
      posts: days ? delta(summary.posts, before.posts) : null,
      views: days ? delta(summary.views, before.views) : null,
      avgViews: days ? delta(summary.avgViews, before.avgViews) : null,
      engagementRate: days ? delta(summary.engagementRate, before.engagementRate) : null,
      skipRate:
        days && summary.skipRate !== null && before.skipRate !== null
          ? delta(summary.skipRate, before.skipRate)
          : null,
      reach: days && summary.reach !== null && before.reach !== null ? delta(summary.reach, before.reach) : null,
      follows:
        days && summary.follows !== null && before.follows !== null ? delta(summary.follows, before.follows) : null,
      profileVisits:
        days && summary.profileVisits !== null && before.profileVisits !== null
          ? delta(summary.profileVisits, before.profileVisits)
          : null,
    },
    series,
    topPosts: top.map((r) => toPost(r, thumbs.get(r.post_id) ?? null)),
    recentPosts: recent.map((r) => toPost(r, thumbs.get(r.post_id) ?? null)),
  };
}

/** Invalidation tag for one handle. Platform-free on purpose — a write about
 *  an account should expire that handle on both platforms, and over-expiring
 *  costs a refetch while under-expiring serves a wrong number. */
export function accountAnalyticsTag(account: string): string {
  return `account-analytics:${account}`;
}

export function getAccountAnalytics(
  account: string | null,
  platform: AnalyticsPlatform,
  range: AccountRangeKey = "7d",
): Promise<Cached<AccountAnalytics>> {
  const entry = ACCOUNT_RANGES.find((r) => r.key === range);
  // `?? 7` would be wrong: "all" carries a deliberate null.
  const days = entry ? entry.days : 7;
  // Platform belongs in the KEY, even though it is absent from the tag above.
  // rowsFor() picks a different table per platform (post_performance vs
  // tt_post_performance), so handle+range alone identified two different
  // answers: the same username on both platforms — which is the normal case
  // here, characters are posted to both — served whichever platform's numbers
  // were fetched first, under the other one's heading. Bumped to v2 so the
  // v1 entries that were computed under the ambiguous key cannot be read back.
  // v4 (2026-10-09, DA-01/02): the payload gained skipRate, reach, follows and
  // profileVisits; an older entry lacks them and would render "undefined%".
  // (v3 was the same day's first cut, before the follows/visits tiles.)
  return cachedFetcher(
    `account-analytics-v4:${account ?? "none"}:${platform}:${range}`,
    TTL.supabase,
    () => fetchAccountAnalytics(account, platform, days),
    // Two tags, two jobs. The per-handle one lets a write about one account
    // expire just that account; the family one lets the Refresh button expire
    // the lot without having to know which handles or ranges exist.
    {
      tags: account ? [ACCOUNT_ANALYTICS_TAG, accountAnalyticsTag(account)] : [ACCOUNT_ANALYTICS_TAG],
    },
  )();
}
