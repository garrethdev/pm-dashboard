import { TTL, cachedFetcher } from "@/lib/data/cache";
import { sbRest, sbRestAll } from "@/lib/data/supabase";
import { type Platform, hasAnalytics, platformProfileUrl, toPlatform } from "@/lib/platform";

/**
 * Everything the single-account page needs (plan §4 detail view).
 *
 * The Geelark automation log comes from `geelark_tasks` in Supabase, not the
 * live Geelark API: the Task Detail Poller already writes every task hourly
 * WITH its resolved fail_code/fail_desc and action counts, so Supabase holds
 * strictly more than a live call would return — and it keeps history after
 * Geelark ages a task out.
 */

export interface AccountTask {
  taskId: string;
  at: string;
  /** Human label: post / warmup / device-warmup, falling back to the type. */
  kind: string;
  status: number | null;
  statusLabel: string;
  failCode: string | null;
  failDesc: string | null;
  /** e.g. {likes: 3, follows: 1} from the warmup RPA. */
  actions: Record<string, number> | null;
  sourceWorkflow: string | null;
}

export interface AccountDetail {
  profile: string;
  username: string | null;
  platform: Platform;
  character: string | null;
  allowedContentTypes: string[];
  isActive: boolean;
  paused: boolean;
  /** Who posts: the Geelark robot, or a person on a real iPhone (PF-01). */
  deliveryMode: "geelark" | "manual";
  health: string;
  accountCreatedOn: string | null;
  profileUrl: string | null;
  /** From the platform itself — null when the lookup fails or is skipped. */
  avatarUrl: string | null;
  displayName: string | null;
  followers: number | null;
  /** Views, all-time, across both perf tables. */
  /** median_7d_r from v_account_health_v3 — a median, not a mean. */
  medianViews7d: number | null;
  highestViews: number | null;
  totalViews: number | null;
  postsCounted: number;
  /** Already fired, newest first. */
  tasks: AccountTask[];
  /** Queued by the scheduler, soonest first — a plan, not a log. */
  pendingTasks: AccountTask[];
}

/** Geelark task status codes as observed in geelark_tasks. */
const STATUS_LABEL: Record<number, string> = {
  1: "Waiting",
  2: "Running",
  3: "Success",
  4: "Failed",
  7: "Cancelled",
};

/** task_type when task_category is missing (older rows predate categorising). */
const TYPE_LABEL: Record<number, string> = {
  1: "Post",
  3: "Post",
  42: "RPA flow",
  90: "Phone bootup",
};

/**
 * Friendly names for task_category. The raw values don't distinguish an
 * ACCOUNT warmup (type 42 — scrolling, liking and following inside the app)
 * from a DEVICE boot (type 90 — starting the cloud phone so it stays alive).
 * Both read as "warmup" in the log, which made a phone bootup today look like
 * the account had been warmed today.
 */
const KIND_LABEL: Record<string, string> = {
  warmup: "Account warmup",
  "device-warmup": "Phone bootup",
  post: "Post",
};

interface RawTask {
  task_id: string;
  schedule_at: string;
  task_type: number | null;
  task_category: string | null;
  status: number | null;
  fail_code: string | null;
  fail_desc: string | null;
  action_counts: Record<string, number> | null;
  source_workflow: string | null;
  source_carousel_id: string | null;
}

function toTask(t: RawTask): AccountTask {
  return {
    taskId: t.task_id,
    at: t.schedule_at,
    kind: taskKind(t),
    status: t.status,
    statusLabel: t.status === null ? "Pending" : (STATUS_LABEL[t.status] ?? `Status ${t.status}`),
    failCode: t.fail_code,
    failDesc: t.fail_desc,
    actions: t.action_counts,
    sourceWorkflow: t.source_workflow,
  };
}

function taskKind(t: {
  task_category: string | null;
  task_type: number | null;
  source_carousel_id: string | null;
}): string {
  if (t.task_category) return KIND_LABEL[t.task_category] ?? t.task_category;
  // A carousel id is proof it was a content post regardless of type.
  if (t.source_carousel_id) return "post";
  return t.task_type !== null ? (TYPE_LABEL[t.task_type] ?? `type ${t.task_type}`) : "unknown";
}

interface ProfileCard {
  avatarUrl: string | null;
  displayName: string | null;
  followers: number | null;
}
const EMPTY_CARD: ProfileCard = { avatarUrl: null, displayName: null, followers: null };

/**
 * How long a cached profile card is trusted. NOT indefinite: the avatar links
 * are signed CDN URLs (fbcdn / tiktokcdn) that expire, and follower counts
 * move. 7 days trades a stale-by-a-week follower count for ~7x fewer
 * ScrapeCreators credits than the previous 24h in-memory cache.
 */
const CARD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * When the avatar URL's own signature runs out.
 *
 * Both platforms hand out signed CDN links that die long before our 7-day
 * cache does — measured 2026-09-07: a TikTok avatar cached 114h earlier had
 * expired 3 days prior, an Instagram one 9 hours prior, and both answered 403.
 * The row was still "fresh" by TTL, so the dashboard kept serving a dead link
 * and the account showed a broken image.
 *
 * TikTok puts the epoch seconds in `x-expires`; Instagram puts them in `oe` as
 * hex. Reading the URL's own deadline refreshes exactly when it must, instead
 * of cutting the TTL for everyone and burning ScrapeCreators credits on cards
 * that were still fine.
 */
function avatarExpiresAt(url: string | null): number | null {
  if (!url) return null;
  try {
    const q = new URL(url).searchParams;
    const tt = q.get("x-expires");
    if (tt && /^\d+$/.test(tt)) return Number(tt) * 1000;
    const ig = q.get("oe");
    if (ig && /^[0-9a-fA-F]+$/.test(ig)) return parseInt(ig, 16) * 1000;
  } catch {
    /* not a URL we can read a deadline from — fall back to the TTL alone */
  }
  return null;
}

interface CachedCard {
  avatar_url: string | null;
  display_name: string | null;
  followers: number | null;
  resolved_at: string;
}

/** One ScrapeCreators lookup. Throws on a bad response so callers can decide
 *  whether to fall back — a failure must never be written to the cache. */
async function fetchProfileCard(handle: string, platform: string): Promise<ProfileCard> {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key) throw new Error("SCRAPECREATORS_API_KEY is not configured");
  const url =
    platform === "instagram"
      ? `https://api.scrapecreators.com/v1/instagram/profile?handle=${encodeURIComponent(handle)}`
      : `https://api.scrapecreators.com/v1/tiktok/profile?handle=${encodeURIComponent(handle)}`;

  const res = await fetch(url, {
    headers: { "x-api-key": key },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`scrapecreators ${res.status}`);
  const body = (await res.json()) as Record<string, unknown>;

  if (platform === "instagram") {
    const u = ((body.data as Record<string, unknown>)?.user ?? {}) as Record<string, unknown>;
    if (!u.profile_pic_url && !u.profile_pic_url_hd && !u.full_name) {
      throw new Error("scrapecreators: no instagram user in response");
    }
    return {
      avatarUrl: (u.profile_pic_url_hd ?? u.profile_pic_url ?? null) as string | null,
      displayName: (u.full_name ?? null) as string | null,
      followers:
        ((u.edge_followed_by as Record<string, unknown>)?.count as number | undefined) ?? null,
    };
  }

  const u = (body.user ?? {}) as Record<string, unknown>;
  const st = (body.statsV2 ?? body.stats ?? {}) as Record<string, unknown>;
  // A deactivated/renamed handle returns success with an empty user. That is a
  // real answer about the account, so it is cached rather than retried forever.
  if (!u.uniqueId && body.account_deactivated !== true) {
    throw new Error("scrapecreators: no tiktok user in response");
  }
  const followers = st.followerCount;
  return {
    avatarUrl: (u.avatarLarger ?? u.avatarMedium ?? null) as string | null,
    displayName: (u.nickname ?? null) as string | null,
    followers: followers == null ? null : Number(followers),
  };
}

/**
 * Profile card, served from Supabase and refreshed on a TTL.
 *
 * Cached in the DB rather than in-process because unstable_cache is per server
 * instance and resets on every deploy — the same account was costing a credit
 * again and again. Only successful lookups are written; on failure we serve
 * whatever row exists (even an expired one) in preference to showing nothing.
 */
async function getProfileCard(handle: string, platform: string): Promise<ProfileCard> {
  if (!handle) return EMPTY_CARD;

  let cached: CachedCard | null = null;
  try {
    // Platform is part of the lookup, not just a stored field. A handle is only
    // unique WITHIN a platform: @somename on TikTok and @somename on Instagram
    // are two different accounts with two different avatars and follower
    // counts, and matching on the handle alone would hand one account's card to
    // the other. No handle is currently on both platforms (checked live
    // 2026-09-11, 59 accounts), so this has never actually misfired — the
    // migration alongside it makes sure it cannot start.
    const rows = await sbRest<CachedCard[]>(
      "account_profile_cards?select=avatar_url,display_name,followers,resolved_at" +
        `&username=eq.${encodeURIComponent(handle)}&platform=eq.${encodeURIComponent(platform)}`,
    );
    cached = rows[0] ?? null;
  } catch {
    /* cache unreachable — fall through to a live lookup */
  }

  // Fresh means BOTH: inside our TTL, and the avatar link has not expired.
  // A 60s margin so a link about to die is not handed to the browser.
  const expiry = avatarExpiresAt(cached?.avatar_url ?? null);
  const linkAlive = expiry === null || expiry > Date.now() + 60_000;
  const fresh =
    cached !== null &&
    Date.now() - new Date(cached.resolved_at).getTime() < CARD_TTL_MS &&
    linkAlive;
  if (cached && fresh) {
    return {
      avatarUrl: cached.avatar_url,
      displayName: cached.display_name,
      followers: cached.followers,
    };
  }

  let card: ProfileCard;
  try {
    card = await fetchProfileCard(handle, platform);
  } catch {
    // Stale beats empty for the text: the name and follower count are almost
    // certainly still right. The avatar is different — a link we have already
    // established is past its signature will 403, so handing it to the browser
    // guarantees a failed request per viewer. Drop it and let the placeholder
    // stand in. (An earlier comment here claimed an expired URL "may still
    // render"; measured 2026-09-07, it does not.)
    return cached
      ? {
          avatarUrl: linkAlive ? cached.avatar_url : null,
          displayName: cached.display_name,
          followers: cached.followers,
        }
      : EMPTY_CARD;
  }

  try {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/account_profile_cards`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        username: handle,
        platform,
        avatar_url: card.avatarUrl,
        display_name: card.displayName,
        followers: card.followers,
        resolved_at: new Date().toISOString(),
      }),
      cache: "no-store",
    });
  } catch {
    /* the page still renders; we just pay a credit again next time */
  }

  return card;
}

async function fetchDetail(profile: string): Promise<AccountDetail | null> {
  const enc = encodeURIComponent(profile);

  const nowIso = new Date().toISOString();
  const TASK_COLS =
    "task_id,schedule_at,task_type,task_category,status,fail_code,fail_desc,action_counts,source_workflow,source_carousel_id";

  const [rows, healthRows, tasks, pending, modeRows] = await Promise.all([
    sbRest<
      {
        geelark_profile: string;
        username: string | null;
        platform: string;
        character: string | null;
        allowed_content_types: string[] | null;
        is_active: boolean;
        posting_paused: boolean | null;
        account_created_on: string | null;
      }[]
    >(
      `accounts_with_content_types?select=geelark_profile,username,platform,character,allowed_content_types,is_active,posting_paused,account_created_on&geelark_profile=eq.${enc}`,
    ),
    sbRest<
      {
        health: string | null;
        median_7d_r: number | null;
      }[]
    >(
      `v_account_health_v3?select=health,median_7d_r&geelark_profile=eq.${enc}`,
    ),
    // Executed: already fired. A future row is a plan, not a log, so the two
    // are fetched separately and shown under their own tab.
    sbRest<RawTask[]>(
      `geelark_tasks?select=${TASK_COLS}&serial_name=eq.${enc}&schedule_at=lte.${nowIso}&order=schedule_at.desc&limit=200`,
    ),
    sbRest<RawTask[]>(
      `geelark_tasks?select=${TASK_COLS}&serial_name=eq.${enc}&schedule_at=gt.${nowIso}&order=schedule_at.asc&limit=200`,
    ),
    // Read off the table itself: accounts_with_content_types predates the
    // column and does not carry it.
    sbRest<{ delivery_mode: string | null }[]>(
      `accounts?select=delivery_mode&geelark_profile=eq.${enc}`,
    ),
  ]);

  const a = rows[0];
  if (!a) return null;

  const platform = toPlatform(a.platform);
  // Facebook has no performance feed and no profile lookup yet (PF-08). Its
  // numbers stay empty rather than being read from the TikTok side, where the
  // handle would either find nothing (and look dead) or find a stranger.
  const measured = hasAnalytics(platform);

  // Views live in two tables PostgREST cannot UNION, so pull the account's rows
  // from each and aggregate here. One account's history is a few hundred rows —
  // but paged rather than taken in one gulp, because PostgREST stops at 1000
  // rows without saying so, and "highest" and "total views" computed over a
  // silent prefix would just be wrong numbers with no way to tell.
  const perfTable = platform === "instagram" ? "post_performance" : "tt_post_performance";
  const views = a.username && measured
    ? await sbRestAll<{ views: number | null }>(
        `${perfTable}?select=views&account=eq.${encodeURIComponent(a.username)}&order=post_id.asc`,
      ).catch(() => [])
    : [];
  const nums = views.map((v) => v.views ?? 0).filter((n) => Number.isFinite(n));

  const card = a.username && measured
    ? await getProfileCard(a.username, platform)
    : { avatarUrl: null, displayName: null, followers: null };

  return {
    profile: a.geelark_profile,
    username: a.username,
    platform,
    character: a.character || null,
    allowedContentTypes: a.allowed_content_types ?? [],
    isActive: a.is_active,
    paused: a.posting_paused === true,
    deliveryMode: modeRows[0]?.delivery_mode === "manual" ? "manual" : "geelark",
    health: healthRows[0]?.health ?? "no data",
    accountCreatedOn: a.account_created_on,
    profileUrl: platformProfileUrl(platform, a.username),
    avatarUrl: card.avatarUrl,
    displayName: card.displayName,
    followers: card.followers,
    medianViews7d: measured ? (healthRows[0]?.median_7d_r ?? null) : null,
    highestViews: nums.length ? Math.max(...nums) : null,
    totalViews: nums.length ? nums.reduce((s, n) => s + n, 0) : null,
    postsCounted: nums.length,
    tasks: tasks.map(toTask),
    pendingTasks: pending.map(toTask),
  };
}

/** The cache tag for one account's page, so a write can expire exactly it. */
export function accountDetailTag(profile: string): string {
  return `account-detail-v9:${profile}`;
}

export function getAccountDetail(profile: string) {
  // v2 in the key: unstable_cache keys on the string, not the function body, so
  // a logic change alone will keep serving the old shape until the TTL lapses.
  return cachedFetcher(accountDetailTag(profile), TTL.supabase, () => fetchDetail(profile))();
}
