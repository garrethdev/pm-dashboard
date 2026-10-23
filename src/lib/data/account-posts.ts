import { accountAnalyticsTag } from "@/lib/data/account-analytics";
import { ACCOUNT_ANALYTICS_TAG, TTL, cachedFetcher, type Cached } from "@/lib/data/cache";
import { sbRestAll } from "@/lib/data/supabase";
import { type AnalyticsPlatform, perfTable } from "@/lib/platform";

/**
 * Every post one account has made, with every number we hold for it: the
 * "All posts" tab on the account page (Czedrick, 2026-10-09). The Analytics
 * tab shows a top five and a last five; this is the whole list.
 *
 * Each platform measures different things, so a number a platform or a post
 * does not have is null, never 0:
 *   - Instagram: reach on every post; skip rate and watch time on Reels;
 *     follows and profile visits on carousels and photos (DA-01).
 *   - TikTok: views, likes, comments, shares, saves.
 *   - Facebook: views on reels only (photo-post views are owner-only), likes
 *     and comments; no shares or saves.
 *
 * Since 2026-10-23 each post also carries its newest screen reading (DA-08):
 * what the app's own analytics screen said when the robot, or a person, last
 * read it. Those columns are empty until a post has been read.
 *
 * Thumbnails are left out on purpose. Each one is an outbound lookup, and on
 * Facebook a paid credit, so a list of every post would cost one per row.
 */

export interface AccountPostRow {
  postId: string;
  postUrl: string | null;
  postedAt: string;
  /** "video" | "carousel" | "photo" | "unknown", as the ingest stored it. */
  format: string | null;
  caption: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  skipRate: number | null;
  /** Average watch time in seconds; Instagram Reels only. */
  avgWatchSec: number | null;
  follows: number | null;
  profileVisits: number | null;
  // --- From the newest screen reading (DA-08). Empty until the post is read.
  /** TikTok: % who watched the whole video. */
  fullPct: number | null;
  /** TikTok: total play time in seconds. */
  totalWatchSec: number | null;
  /** Followers gained from this post, as the screen counts them. */
  newFollowers: number | null;
  /** The biggest source of views, e.g. "Reels tab", and its share. */
  topSourceName: string | null;
  topSourcePct: number | null;
  /** Instagram: views the Facebook crosspost got. */
  fbViews: number | null;
  /** TikTok: true when the app said the video is held out of the For You feed. */
  fypRestricted: boolean | null;
  /** When the screen was read. */
  readAt: string | null;
}

interface RawPost {
  post_id: string;
  post_url: string | null;
  posted_at: string;
  format: string | null;
  caption_snippet: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach?: number | null;
  skip_rate?: number | string | null;
  avg_watch_ms?: number | null;
  follows?: number | null;
  profile_visits?: number | null;
}

const num = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v));

export function toPostRow(r: RawPost, platform: AnalyticsPlatform): AccountPostRow {
  const views = num(r.views);
  const isReel = platform === "instagram" && r.format === "video";
  return {
    postId: r.post_id,
    postUrl: r.post_url,
    postedAt: r.posted_at,
    format: r.format,
    caption: r.caption_snippet,
    views,
    likes: num(r.likes),
    comments: num(r.comments),
    // Facebook's reads carry neither; the columns exist but are never filled.
    shares: platform === "facebook" ? null : num(r.shares),
    saves: platform === "facebook" ? null : num(r.saves),
    reach: num(r.reach),
    // With no viewers there is nothing to skip: Instagram reports 0%, which
    // would read as a perfect hook.
    skipRate: views ? num(r.skip_rate) : null,
    // The Instagram ingest writes 0 for posts that are not Reels; only a Reel
    // has a watch time.
    avgWatchSec: isReel && r.avg_watch_ms ? Math.round(Number(r.avg_watch_ms) / 100) / 10 : null,
    follows: num(r.follows),
    profileVisits: num(r.profile_visits),
    fullPct: null,
    totalWatchSec: null,
    newFollowers: null,
    topSourceName: null,
    topSourcePct: null,
    fbViews: null,
    fypRestricted: null,
    readAt: null,
  };
}

/** The columns of a post_screen_readings row that the list shows. */
export interface RawReading {
  post_url: string | null;
  read_at: string;
  avg_watch_s: number | string | null;
  watched_full_pct: number | string | null;
  total_watch_s: number | string | null;
  new_followers: number | null;
  viewers: number | null;
  views_facebook: number | null;
  traffic_sources: Record<string, number> | null;
  fyp_restricted: boolean | null;
}

/** The newest reading per post, from a list ordered newest first. */
export function latestByPost(readings: RawReading[]): Map<string, RawReading> {
  const out = new Map<string, RawReading>();
  for (const r of readings) {
    if (r.post_url && !out.has(r.post_url)) out.set(r.post_url, r);
  }
  return out;
}

/**
 * Lays the reading's numbers on the row. What the API already gives stays;
 * the reading fills only what the API never had (TikTok's watch time,
 * Facebook's reach), so a number does not change meaning between posts.
 */
export function withReading(row: AccountPostRow, r: RawReading | undefined): AccountPostRow {
  if (!r) return row;
  const sources = r.traffic_sources ? Object.entries(r.traffic_sources).filter(([, v]) => typeof v === "number") : [];
  const top = sources.sort((a, b) => b[1] - a[1])[0] ?? null;
  const watch = num(r.avg_watch_s);
  return {
    ...row,
    avgWatchSec: row.avgWatchSec ?? (watch === null ? null : Math.round(watch * 10) / 10),
    reach: row.reach ?? num(r.viewers),
    fullPct: num(r.watched_full_pct),
    totalWatchSec: num(r.total_watch_s),
    newFollowers: num(r.new_followers),
    topSourceName: top ? top[0] : null,
    topSourcePct: top ? top[1] : null,
    fbViews: num(r.views_facebook),
    fypRestricted: typeof r.fyp_restricted === "boolean" ? r.fyp_restricted : null,
    readAt: r.read_at,
  };
}

async function fetchAccountPosts(account: string, platform: AnalyticsPlatform): Promise<AccountPostRow[]> {
  const cols =
    "post_id,post_url,posted_at,format,caption_snippet,views,likes,comments,shares,saves" +
    // The deeper numbers exist on the Instagram table only; asking another
    // table for them would fail the whole read.
    (platform === "instagram" ? ",reach,skip_rate,avg_watch_ms,follows,profile_visits" : "");
  const [rows, readings] = await Promise.all([
    sbRestAll<RawPost>(
      `${perfTable(platform)}?select=${cols}&account=eq.${encodeURIComponent(account)}` +
        "&posted_at=not.is.null&order=posted_at.desc,post_id.desc",
    ),
    sbRestAll<RawReading>(
      "post_screen_readings?select=post_url,read_at,avg_watch_s,watched_full_pct,total_watch_s,new_followers,viewers,views_facebook,traffic_sources,fyp_restricted" +
        `&account=eq.${encodeURIComponent(account)}&platform=eq.${platform}&post_url=not.is.null&order=read_at.desc`,
    ),
  ]);
  const latest = latestByPost(readings);
  return rows.map((r) => withReading(toPostRow(r, platform), r.post_url ? latest.get(r.post_url) : undefined));
}

/** Same tags as the Analytics tab, so Refresh expires both together. */
export function getAccountPosts(account: string, platform: AnalyticsPlatform): Promise<Cached<AccountPostRow[]>> {
  return cachedFetcher(
    `account-posts-v2:${account}:${platform}`,
    TTL.supabase,
    () => fetchAccountPosts(account, platform),
    { tags: [ACCOUNT_ANALYTICS_TAG, accountAnalyticsTag(account)] },
  )();
}
