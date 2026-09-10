import { TTL, cachedFetcher } from "@/lib/data/cache";
import { sbRest, sbRpc } from "@/lib/data/supabase";

/**
 * Analytics page (plan §7) — the web version of the weekly combined report.
 *
 * Everything comes from one parameterised RPC, analytics_rollup(p_days,
 * p_platform). Aggregation stays in Postgres because the two perf tables hold
 * ~2.8k rows between them and PostgREST caps a response at 1000, which would
 * silently under-report; and because a median/average has to be computed over
 * the whole set, not a page of it.
 *
 * NOT real-time. Both perf tables are filled by the scheduled ScrapeCreators /
 * Meta Graph ingests, so `lastIngest` is the honest "as of" for this page and
 * is rendered next to the range selector.
 */

export type PlatformKey = "all" | "tiktok" | "instagram";
export type RangeKey = "7d" | "14d" | "30d" | "all";

export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "14d", label: "2 weeks", days: 14 },
  { key: "30d", label: "1 month", days: 30 },
  { key: "all", label: "All time", days: null },
];

export interface SeriesPoint {
  key: string;
  label: string;
  posts: number;
  views: number;
  avgViews: number;
  engagementRate: number;
  tiktokViews: number;
  instagramViews: number;
  /** null = the platform posted nothing in this bucket (a gap, not a zero). */
  tiktokAvgViews: number | null;
  instagramAvgViews: number | null;
  tiktokPosts: number;
  instagramPosts: number;
}

export interface BestAccount {
  account: string;
  platform: string;
  geelarkProfile: string | null;
  views: number;
  posts: number;
  avgViews: number;
  medianViews: number;
  engRate: number | null;
  avatarUrl: string | null;
}

export interface AccountPerfRow {
  account: string;
  platform: string;
  /** e.g. "Profile 20" — lets a row link through to the detail page. */
  geelarkProfile: string | null;
  /** Retired accounts still count toward totals but are marked in the table. */
  isActive: boolean;
  character: string | null;
  posts: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement: number;
  avgViews: number;
  /** Median beats mean here: a throttled account with a few hits has a high
   *  mean and a low median, which is exactly the split we need to see. */
  medianViews: number;
  suppressed: number;
  /** % of posts in range that got <=10 views — the suppression signal. */
  suppressedPct: number;
  engRate: number | null;
}

export interface CharacterRow {
  character: string;
  accounts: number;
  posts: number;
  views: number;
  avgViews: number;
}

export interface ContentTypeRow {
  character: string;
  contentType: string;
  displayName: string;
  posts: number;
  views: number;
  avgViews: number;
  medianViews: number;
  bestViews: number;
  engagement: number;
  engRate: number | null;
}

export interface AnalyticsData {
  rangeDays: number | null;
  bucket: "day" | "week";
  lastIngest: string | null;
  /** Posts attributable to a content type (only those carrying a carousel_id). */
  typedPosts: number;
  summary: {
    posts: number;
    views: number;
    avgViews: number;
    engagement: number;
    engagementRate: number;
    accounts: number;
  };
  /** % change vs the equally-long window before this range; null for All time. */
  deltas: {
    posts: number | null;
    views: number | null;
    avgViews: number | null;
    engagementRate: number | null;
  };
  bestAccount: BestAccount | null;
  series: SeriesPoint[];
  accounts: AccountPerfRow[];
  characters: CharacterRow[];
  contentTypes: ContentTypeRow[];
  /** Every character with live accounts, whether or not it has posted yet.
   *  The rollup's own lists are grouped FROM the performance rows, so a
   *  character with nothing measured is simply absent from them — right for a
   *  chart of results, wrong for a filter, which should offer a character and
   *  then say it has no data rather than pretend it does not exist. */
  characterOptions: string[];
}

/* ── Raw RPC shape (snake_case straight from Postgres) ─────────────────────── */
interface RawRollup {
  range_days: number | null;
  bucket: "day" | "week";
  last_ingest: string | null;
  typed_posts: number;
  summary: {
    posts: number;
    views: number;
    avg_views: number | null;
    engagement: number;
    engagement_rate: number | null;
    accounts: number;
  } | null;
  previous: {
    posts: number;
    views: number;
    avg_views: number | null;
    engagement: number;
    engagement_rate: number | null;
    accounts: number;
  } | null;
  best_account: {
    account: string;
    platform: string;
    geelark_profile: string | null;
    views: number;
    posts: number;
    avg_views: number | null;
    median_views: number | null;
    eng_rate: number | null;
  } | null;
  series: {
    bucket_key: string;
    posts: number;
    views: number;
    avg_views: number | null;
    engagement: number;
    engagement_rate: number | null;
    tiktok_views: number;
    instagram_views: number;
    tiktok_avg_views: number | null;
    instagram_avg_views: number | null;
    tiktok_posts: number | null;
    instagram_posts: number | null;
  }[];
  accounts: {
    account: string;
    platform: string;
    geelark_profile: string | null;
    is_active: boolean | null;
    character: string | null;
    posts: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagement: number;
    avg_views: number | null;
    median_views: number | null;
    suppressed: number | null;
    suppressed_pct: number | null;
    eng_rate: number | null;
  }[];
  characters: {
    character: string;
    accounts: number;
    posts: number;
    views: number;
    avg_views: number | null;
  }[];
  content_types: {
    character: string;
    content_type: string;
    display_name: string;
    posts: number;
    views: number;
    avg_views: number | null;
    median_views: number | null;
    best_views: number | null;
    engagement: number;
    eng_rate: number | null;
  }[];
}

const n = (v: number | null | undefined) => (v == null ? 0 : Number(v));

/** % change, or null when there is no comparable earlier window (All time) or
 *  the baseline is zero — "up from nothing" is not a percentage. */
function pct(current: number, previous: number | null | undefined): number | null {
  if (previous == null) return null;
  const base = Number(previous);
  if (!base) return null;
  return Math.round(((current - base) / base) * 100);
}

/** Day buckets get "Aug 26"; week buckets get "wk Aug 24". */
function bucketLabel(key: string, bucket: "day" | "week") {
  const d = new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return bucket === "week" ? `wk ${d}` : d;
}

async function fetchAnalytics(days: number | null, platform: PlatformKey): Promise<AnalyticsData> {
  const [raw, liveAccounts] = await Promise.all([
    sbRpc<RawRollup>("analytics_rollup", {
      p_days: days,
      p_platform: platform,
    }),
    // Straight off accounts, not off the rollup: this is the "what exists"
    // list, and it must not depend on anything having been measured yet.
    sbRest<{ character: string | null }[]>(
      "accounts?select=character&is_active=eq.true&character=like.Character*",
    ).catch((): { character: string | null }[] => []),
  ]);

  const characterOptions = [
    ...new Set(liveAccounts.map((a) => a.character).filter((c): c is string => Boolean(c))),
  ].sort();

  // The winning account's avatar is already cached from the Accounts pages, so
  // this costs a Supabase read rather than a ScrapeCreators credit.
  let avatarUrl: string | null = null;
  if (raw.best_account?.account) {
    avatarUrl = await sbRest<{ avatar_url: string | null }[]>(
      `account_profile_cards?select=avatar_url&username=eq.${encodeURIComponent(raw.best_account.account)}`,
    )
      .then((r) => r[0]?.avatar_url ?? null)
      .catch(() => null);
  }

  return {
    rangeDays: raw.range_days,
    bucket: raw.bucket,
    lastIngest: raw.last_ingest,
    typedPosts: n(raw.typed_posts),
    summary: {
      posts: n(raw.summary?.posts),
      views: n(raw.summary?.views),
      avgViews: n(raw.summary?.avg_views),
      engagement: n(raw.summary?.engagement),
      engagementRate: n(raw.summary?.engagement_rate),
      accounts: n(raw.summary?.accounts),
    },
    deltas: {
      posts: pct(n(raw.summary?.posts), raw.previous?.posts),
      views: pct(n(raw.summary?.views), raw.previous?.views),
      avgViews: pct(n(raw.summary?.avg_views), raw.previous?.avg_views),
      engagementRate: pct(n(raw.summary?.engagement_rate), raw.previous?.engagement_rate),
    },
    bestAccount: raw.best_account
      ? {
          account: raw.best_account.account,
          platform: raw.best_account.platform,
          views: n(raw.best_account.views),
          posts: n(raw.best_account.posts),
          geelarkProfile: raw.best_account.geelark_profile,
          avgViews: n(raw.best_account.avg_views),
          medianViews: n(raw.best_account.median_views),
          engRate: raw.best_account.eng_rate == null ? null : Number(raw.best_account.eng_rate),
          avatarUrl,
        }
      : null,
    series: (raw.series ?? []).map((s) => ({
      key: s.bucket_key,
      label: bucketLabel(s.bucket_key, raw.bucket),
      posts: n(s.posts),
      views: n(s.views),
      avgViews: n(s.avg_views),
      engagementRate: n(s.engagement_rate),
      tiktokViews: n(s.tiktok_views),
      instagramViews: n(s.instagram_views),
      tiktokAvgViews: s.tiktok_avg_views == null ? null : Number(s.tiktok_avg_views),
      instagramAvgViews: s.instagram_avg_views == null ? null : Number(s.instagram_avg_views),
      tiktokPosts: n(s.tiktok_posts),
      instagramPosts: n(s.instagram_posts),
    })),
    accounts: (raw.accounts ?? []).map((a) => ({
      account: a.account,
      platform: a.platform,
      geelarkProfile: a.geelark_profile,
      isActive: a.is_active === true,
      character: a.character,
      posts: n(a.posts),
      views: n(a.views),
      likes: n(a.likes),
      comments: n(a.comments),
      shares: n(a.shares),
      saves: n(a.saves),
      engagement: n(a.engagement),
      avgViews: n(a.avg_views),
      medianViews: n(a.median_views),
      suppressed: n(a.suppressed),
      suppressedPct: n(a.suppressed_pct),
      engRate: a.eng_rate == null ? null : Number(a.eng_rate),
    })),
    characters: (raw.characters ?? []).map((c) => ({
      character: c.character,
      accounts: n(c.accounts),
      posts: n(c.posts),
      views: n(c.views),
      avgViews: n(c.avg_views),
    })),
    characterOptions,
    contentTypes: (raw.content_types ?? []).map((t) => ({
      character: t.character,
      contentType: t.content_type,
      displayName: t.display_name,
      posts: n(t.posts),
      views: n(t.views),
      avgViews: n(t.avg_views),
      medianViews: n(t.median_views),
      bestViews: n(t.best_views),
      engagement: n(t.engagement),
      engRate: t.eng_rate == null ? null : Number(t.eng_rate),
    })),
  };
}

export function getAnalytics(range: RangeKey = "7d", platform: PlatformKey = "all") {
  // `?? 7` would be wrong here: "all" carries a deliberate null.
  const entry = RANGES.find((r) => r.key === range);
  const days = entry ? entry.days : 7;
  return cachedFetcher(`analytics-v12:${range}:${platform}`, TTL.supabase, () =>
    fetchAnalytics(days, platform),
  )();
}

/* ── AI analysis of the top content ────────────────────────────────────────── */

export type ContentRange = "week" | "month" | "all";

export const CONTENT_RANGES: { key: ContentRange; label: string; days: number | null }[] = [
  { key: "week", label: "This Week", days: 7 },
  { key: "month", label: "This Month", days: 30 },
  { key: "all", label: "All Time", days: null },
];

export interface TopContentPost {
  account: string;
  platform: string;
  postId: string;
  url: string | null;
  caption: string | null;
  mediaType: string | null;
  views: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engRate: number | null;
  postedAt: string;
  /** null when the judge hasn't scored this post yet. */
  score: number | null;
  verdict: string | null;
  scores: Record<string, number> | null;
}

export interface TopContentData {
  judged: number;
  posts: TopContentPost[];
}

export function getTopContent(range: ContentRange = "week") {
  const entry = CONTENT_RANGES.find((r) => r.key === range);
  const days = entry ? entry.days : 7;
  return cachedFetcher(`analytics-top-content-v1:${range}`, TTL.supabase, async () => {
    const raw = await sbRpc<{ judged: number; posts: TopContentPost[] }>("analytics_top_content", {
      p_days: days,
      p_limit: 12,
    });
    return { judged: n(raw.judged), posts: raw.posts ?? [] } satisfies TopContentData;
  })();
}
