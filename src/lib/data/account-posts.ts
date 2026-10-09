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
  };
}

async function fetchAccountPosts(account: string, platform: AnalyticsPlatform): Promise<AccountPostRow[]> {
  const cols =
    "post_id,post_url,posted_at,format,caption_snippet,views,likes,comments,shares,saves" +
    // The deeper numbers exist on the Instagram table only; asking another
    // table for them would fail the whole read.
    (platform === "instagram" ? ",reach,skip_rate,avg_watch_ms,follows,profile_visits" : "");
  const rows = await sbRestAll<RawPost>(
    `${perfTable(platform)}?select=${cols}&account=eq.${encodeURIComponent(account)}` +
      "&posted_at=not.is.null&order=posted_at.desc,post_id.desc",
  );
  return rows.map((r) => toPostRow(r, platform));
}

/** Same tags as the Analytics tab, so Refresh expires both together. */
export function getAccountPosts(account: string, platform: AnalyticsPlatform): Promise<Cached<AccountPostRow[]>> {
  return cachedFetcher(
    `account-posts-v1:${account}:${platform}`,
    TTL.supabase,
    () => fetchAccountPosts(account, platform),
    { tags: [ACCOUNT_ANALYTICS_TAG, accountAnalyticsTag(account)] },
  )();
}
