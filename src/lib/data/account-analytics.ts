import { ACCOUNT_ANALYTICS_TAG, TTL, cachedFetcher, type Cached } from "@/lib/data/cache";
import { sbRestAll } from "@/lib/data/supabase";
import { resolveThumbnail } from "@/lib/data/top-posts";

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
}

export interface AccountPost {
  postId: string;
  postUrl: string;
  postedAt: string;
  caption: string | null;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
  thumbnailUrl: string | null;
}

export interface AccountAnalytics {
  account: string | null;
  platform: "tiktok" | "instagram";
  rangeDays: number | null;
  bucket: "day" | "week";
  lastIngest: string | null;
  summary: {
    posts: number;
    views: number;
    avgViews: number;
    engagement: number;
    engagementRate: number;
  };
  /** % change vs the equally-long window before this range; null for All time. */
  deltas: {
    posts: number | null;
    views: number | null;
    avgViews: number | null;
    engagementRate: number | null;
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
}

const n = (v: number | null | undefined) => Number(v ?? 0);

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
async function rowsFor(account: string, platform: string, sinceIso: string | null) {
  const table = platform === "instagram" ? "post_performance" : "tt_post_performance";
  const cols = "post_id,post_url,posted_at,caption_snippet,views,likes,comments,total_engagement,ingested_at";
  const since = sinceIso ? `&posted_at=gte.${sinceIso}` : "";
  return sbRestAll<RawRow>(
    `${table}?select=${cols}&account=eq.${encodeURIComponent(account)}${since}` +
      "&order=posted_at.desc,post_id.desc",
  );
}

function summarise(rows: RawRow[]) {
  const posts = rows.length;
  const views = rows.reduce((a, r) => a + n(r.views), 0);
  const engagement = rows.reduce((a, r) => a + n(r.total_engagement), 0);
  return {
    posts,
    views,
    engagement,
    avgViews: posts ? Math.round(views / posts) : 0,
    // Against views, not posts: "how many of the people who saw it reacted".
    engagementRate: views ? Math.round((engagement / views) * 1000) / 10 : 0,
  };
}

function toPost(r: RawRow, thumb: string | null): AccountPost {
  return {
    postId: r.post_id,
    postUrl: r.post_url,
    postedAt: r.posted_at,
    caption: r.caption_snippet,
    views: n(r.views),
    likes: n(r.likes),
    comments: n(r.comments),
    engagement: n(r.total_engagement),
    thumbnailUrl: thumb,
  };
}

async function fetchAccountAnalytics(
  account: string | null,
  platform: "tiktok" | "instagram",
  days: number | null,
): Promise<AccountAnalytics> {
  const bucket = bucketOf(days);
  const empty: AccountAnalytics = {
    account,
    platform,
    rangeDays: days,
    bucket,
    lastIngest: null,
    summary: { posts: 0, views: 0, avgViews: 0, engagement: 0, engagementRate: 0 },
    deltas: { posts: null, views: null, avgViews: null, engagementRate: null },
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
  const byBucket = new Map<string, { posts: number; views: number; engagement: number }>();
  for (const r of current) {
    const k = bucketKey(r.posted_at, bucket);
    const b = byBucket.get(k) ?? { posts: 0, views: 0, engagement: 0 };
    b.posts += 1;
    b.views += n(r.views);
    b.engagement += n(r.total_engagement);
    byBucket.set(k, b);
  }
  const series: AccountSeriesPoint[] = [...byBucket.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: bucketLabel(key, bucket),
      posts: v.posts,
      views: v.views,
      avgViews: v.posts ? Math.round(v.views / v.posts) : 0,
      engagementRate: v.views ? Math.round((v.engagement / v.views) * 1000) / 10 : 0,
    }));

  const top = [...current].sort((a, b) => n(b.views) - n(a.views)).slice(0, 5);
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
  platform: "tiktok" | "instagram",
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
  return cachedFetcher(
    `account-analytics-v2:${account ?? "none"}:${platform}:${range}`,
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
