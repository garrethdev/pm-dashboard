/**
 * The Facebook analytics robot (PF-24). It runs on TikTok's rhythm (Garreth,
 * 2026-10-07: "fully match TikTok"): a full read on Sun/Mon/Wed/Fri like the
 * TikTok Analytics Engine, and a light one-page read on Tue/Thu/Sat like
 * TikTok's "Recent Posts Refresh — gap days". Each run
 * reads every live Facebook account through ScrapeCreators and writes the numbers into
 * fb_post_performance, where the health views and the Analytics page read
 * them beside TikTok and Instagram.
 *
 * Why ScrapeCreators and not Meta: the accounts are ordinary personal
 * profiles, which Meta's API does not report on (checked 2026-10-07, BACKLOG
 * PF-24). ScrapeCreators reads them as they are, by profile link.
 *
 * Two lists per account, because neither has everything:
 *   - the reels list carries the VIEW count (10 reels a page);
 *   - the posts list carries likes and comments but no views (3 posts a page).
 * Each page is one credit. Views are what health runs on, so the reels list is
 * read back far enough to cover health's 28-day window; the posts list only
 * for the newest few, and older reels keep the likes they last had.
 *
 * Matching a reel to what Yurie posted: the link she pastes on Posted is
 * usually a share link (facebook.com/share/r/<code>), which Facebook redirects
 * to story.php?story_fbid=<post id>. That post id is the reels list's
 * post_id, so the match is exact. A pasted /reel/<number> link matches on the
 * video id instead.
 */
import { platformProfileUrl } from "@/lib/platform";

const SC_BASE = "https://api.scrapecreators.com/v1/facebook";

/** How far back the reels list is read each run. Health looks at 28 days. */
export const REEL_LOOKBACK_DAYS = 30;
/** Hard ceilings on credits per account per run, by kind of run. */
export const PAGE_LIMITS = {
  full: { reels: 4, posts: 2 },
  light: { reels: 1, posts: 1 },
} as const;
export type RunMode = keyof typeof PAGE_LIMITS;

/** Sun/Mon/Wed/Fri in New York are full runs, as TikTok's are; the rest light. */
export function modeFor(at: Date): RunMode {
  const day = new Date(at.toLocaleString("en-US", { timeZone: "America/New_York" })).getDay();
  return [0, 1, 3, 5].includes(day) ? "full" : "light";
}

type Limits = (typeof PAGE_LIMITS)[RunMode];
/** Posted rows older than this are not worth matching again. */
const MATCH_LOOKBACK_DAYS = 35;

// ---------------------------------------------------------------------------
// Pure parts (tested in facebook-analytics.test.ts)
// ---------------------------------------------------------------------------

export type PostRef = { kind: "post"; id: string } | { kind: "video"; id: string } | { kind: "share"; url: string };

/**
 * What a pasted Facebook link names, as far as the link alone can say.
 * A share link has to be followed (resolveShareLink) before it names anything.
 */
export function parseFacebookLink(raw: string | null | undefined): PostRef | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)facebook\.com$|(^|\.)fb\.watch$/i.test(u.hostname)) return null;
  const story = u.searchParams.get("story_fbid");
  if (story && /^\d+$/.test(story)) return { kind: "post", id: story };
  const fbid = u.searchParams.get("fbid");
  if (fbid && /^\d+$/.test(fbid)) return { kind: "post", id: fbid };
  const reel = u.pathname.match(/\/reels?\/(\d+)/);
  if (reel) return { kind: "video", id: reel[1] };
  const video = u.pathname.match(/\/videos\/(?:[^/]+\/)?(\d+)/);
  if (video) return { kind: "video", id: video[1] };
  const watch = u.searchParams.get("v");
  if (u.pathname.startsWith("/watch") && watch && /^\d+$/.test(watch)) return { kind: "video", id: watch };
  const posts = u.pathname.match(/\/posts\/(\d+)/);
  if (posts) return { kind: "post", id: posts[1] };
  if (u.pathname.startsWith("/share/") || /fb\.watch$/i.test(u.hostname)) return { kind: "share", url: u.toString() };
  return null;
}

export interface ScReel {
  post_id?: string;
  video_id?: string;
  url?: string;
  creation_time?: string;
  view_count?: number | null;
  description?: string | null;
  play_time_in_ms?: number | null;
  music?: { track_title?: string | null } | null;
}

export interface ScPost {
  id?: string;
  reactionCount?: number | null;
  commentCount?: number | null;
}

export interface ReelRow {
  account: string;
  post_id: string;
  video_id: string | null;
  post_url: string | null;
  posted_at: string | null;
  format: string;
  caption_snippet: string | null;
  views: number | null;
  week_of: string | null;
  source: string;
  raw_payload: Record<string, unknown>;
  ingested_at: string;
}

/** Monday of the posted week, in New York time, as YYYY-MM-DD. */
export function weekOf(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ny = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const back = (ny.getDay() + 6) % 7;
  ny.setDate(ny.getDate() - back);
  const m = String(ny.getMonth() + 1).padStart(2, "0");
  const day = String(ny.getDate()).padStart(2, "0");
  return `${ny.getFullYear()}-${m}-${day}`;
}

/** One reel from the reels list as a row. Null when it carries no post id. */
export function reelToRow(account: string, r: ScReel, now: string): ReelRow | null {
  if (!r.post_id) return null;
  const posted = r.creation_time ?? null;
  return {
    account,
    post_id: String(r.post_id),
    video_id: r.video_id ? String(r.video_id) : null,
    post_url: r.url ?? (r.video_id ? `https://www.facebook.com/reel/${r.video_id}` : null),
    posted_at: posted,
    format: "video",
    caption_snippet: r.description ? r.description.slice(0, 200) : null,
    views: typeof r.view_count === "number" ? r.view_count : null,
    week_of: weekOf(posted),
    source: "scrapecreators",
    // The video link is a signed, expiring CDN address; it is not kept.
    raw_payload: {
      post_id: r.post_id,
      video_id: r.video_id ?? null,
      view_count: r.view_count ?? null,
      play_time_in_ms: r.play_time_in_ms ?? null,
      music: r.music?.track_title ?? null,
    },
    ingested_at: now,
  };
}

// ---------------------------------------------------------------------------
// ScrapeCreators and Facebook
// ---------------------------------------------------------------------------

type Credits = { used: number; remaining: number | null };

async function sc<T>(path: string, params: Record<string, string>, credits: Credits): Promise<T> {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key) throw new Error("SCRAPECREATORS_API_KEY is not configured");
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${SC_BASE}/${path}?${qs}`, {
    headers: { "x-api-key": key },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  credits.used += 1;
  if (!res.ok) throw new Error(`ScrapeCreators ${path} answered HTTP ${res.status}`);
  const body = (await res.json()) as T & { success?: boolean; credits_remaining?: number };
  if (typeof body.credits_remaining === "number") credits.remaining = body.credits_remaining;
  if (body.success === false) throw new Error(`ScrapeCreators ${path} said it failed`);
  return body;
}

/** Reels back to the lookback date, newest first. */
async function readReels(profileUrl: string, credits: Credits, maxPages: number): Promise<ScReel[]> {
  const since = Date.now() - REEL_LOOKBACK_DAYS * 86_400_000;
  const out: ScReel[] = [];
  let cursor: string | undefined;
  let nextPageId: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const params: Record<string, string> = { url: profileUrl };
    if (cursor) params.cursor = cursor;
    if (nextPageId) params.next_page_id = nextPageId;
    const body = await sc<{ reels?: ScReel[]; cursor?: string; next_page_id?: string }>(
      "profile/reels",
      params,
      credits,
    );
    const reels = body.reels ?? [];
    out.push(...reels);
    const oldest = reels.at(-1)?.creation_time;
    const reachedBack = oldest ? new Date(oldest).getTime() < since : true;
    // A page shorter than ten is the end of the list; the cursor it still
    // carries leads to an empty page and a wasted credit.
    if (reachedBack || reels.length < 10 || !body.cursor) break;
    cursor = body.cursor;
    nextPageId = body.next_page_id;
  }
  return out;
}

async function readPosts(profileUrl: string, credits: Credits, maxPages: number): Promise<ScPost[]> {
  const out: ScPost[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const params: Record<string, string> = { url: profileUrl };
    if (cursor) params.cursor = cursor;
    const body = await sc<{ posts?: ScPost[]; cursor?: string }>("profile/posts", params, credits);
    const posts = body.posts ?? [];
    out.push(...posts);
    if (posts.length < 3 || !body.cursor) break;
    cursor = body.cursor;
  }
  return out;
}

/**
 * Follow a share link to the post it names. Facebook answers its own link
 * preview robot with a plain redirect to story.php?story_fbid=..., which is
 * free and needs no login; a browser gets a login wall instead.
 */
export async function resolveShareLink(url: string): Promise<PostRef | null> {
  let next = url;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(next, {
      redirect: "manual",
      headers: { "user-agent": "facebookexternalhit/1.1" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const loc = res.headers.get("location");
    if (!loc) return null;
    next = new URL(loc, next).toString();
    const ref = parseFacebookLink(next);
    if (ref && ref.kind !== "share") return ref;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`supabase HTTP ${res.status} on ${path.split("?")[0]} ${detail.slice(0, 200)}`);
  }
  return res;
}

async function upsert(rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  await db("fb_post_performance?on_conflict=account,post_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

interface FbAccount {
  id: string;
  username: string;
  geelark_profile: string | null;
  posting_paused: boolean | null;
}

interface Delivery {
  id: number;
  account_id: string;
  post_url: string | null;
  source_id: string | null;
  done_at: string | null;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

export interface AccountReport {
  account: string;
  profile: string | null;
  reels: number;
  withViews: number;
  engagementRead: number;
  matched: number;
  unmatchedLinks: string[];
  error?: string;
}

export interface RunReport {
  startedAt: string;
  mode: RunMode;
  accounts: AccountReport[];
  creditsUsed: number;
  creditsRemaining: number | null;
}

/**
 * Accounts worth a credit: live Facebook accounts that are posting, or that
 * posted inside the lookback window (a paused account's recent reels still
 * matter to its health).
 */
async function accountsToRead(): Promise<{ accounts: FbAccount[]; deliveries: Delivery[] }> {
  const accounts = (await (
    await db(
      "accounts?select=id::text,username,geelark_profile,posting_paused" +
        "&platform=eq.facebook&is_active=eq.true&username=not.is.null&order=id.asc",
    )
  ).json()) as FbAccount[];
  if (!accounts.length) return { accounts, deliveries: [] };

  const since = new Date(Date.now() - MATCH_LOOKBACK_DAYS * 86_400_000).toISOString();
  const ids = accounts.map((a) => a.id).join(",");
  const deliveries = (await (
    await db(
      `post_deliveries?select=id,account_id::text,post_url,source_id,done_at` +
        `&account_id=in.(${ids})&status=eq.posted&done_at=gte.${since}&order=done_at.desc`,
    )
  ).json()) as Delivery[];

  const posted = new Set(deliveries.map((d) => d.account_id));
  return {
    accounts: accounts.filter((a) => !a.posting_paused || posted.has(a.id)),
    deliveries,
  };
}

async function alreadyMatched(deliveryIds: number[]): Promise<Set<number>> {
  if (!deliveryIds.length) return new Set();
  const rows = (await (
    await db(`fb_post_performance?select=delivery_id&delivery_id=in.(${deliveryIds.join(",")})`)
  ).json()) as { delivery_id: number }[];
  return new Set(rows.map((r) => r.delivery_id));
}

async function readAccount(
  a: FbAccount,
  deliveries: Delivery[],
  credits: Credits,
  now: string,
  limits: Limits,
): Promise<AccountReport> {
  const report: AccountReport = {
    account: a.username,
    profile: a.geelark_profile,
    reels: 0,
    withViews: 0,
    engagementRead: 0,
    matched: 0,
    unmatchedLinks: [],
  };
  const profileUrl = platformProfileUrl("facebook", a.username);
  if (!profileUrl) return report;

  const reels = await readReels(profileUrl, credits, limits.reels);
  const rows = reels.map((r) => reelToRow(a.username, r, now)).filter((r): r is ReelRow => r !== null);
  // The same reel can come back on two pages if one was posted mid-read.
  const byPost = new Map(rows.map((r) => [r.post_id, r]));
  await upsert([...byPost.values()] as unknown as Record<string, unknown>[]);
  report.reels = byPost.size;
  report.withViews = [...byPost.values()].filter((r) => r.views !== null).length;

  // Likes and comments for the newest posts, written only onto reels we hold:
  // the posts list also carries photos and status updates.
  const posts = await readPosts(profileUrl, credits, limits.posts);
  const engagement = posts
    .filter((p) => p.id && byPost.has(String(p.id)))
    .map((p) => {
      const likes = p.reactionCount ?? null;
      const comments = p.commentCount ?? null;
      return {
        account: a.username,
        post_id: String(p.id),
        likes,
        comments,
        total_engagement: likes === null && comments === null ? null : (likes ?? 0) + (comments ?? 0),
      };
    });
  await upsert(engagement);
  report.engagementRead = engagement.length;

  // Match what Yurie marked Posted to the reel it became.
  const mine = deliveries.filter((d) => d.account_id === a.id);
  const done = await alreadyMatched(mine.map((d) => d.id));
  const byVideo = new Map([...byPost.values()].filter((r) => r.video_id).map((r) => [r.video_id!, r]));
  for (const d of mine) {
    if (done.has(d.id)) continue;
    let ref = parseFacebookLink(d.post_url);
    if (ref?.kind === "share") ref = await resolveShareLink(ref.url).catch(() => null);
    const row =
      ref?.kind === "post" ? byPost.get(ref.id) : ref?.kind === "video" ? byVideo.get(ref.id) : undefined;
    if (!row) {
      if (d.post_url) report.unmatchedLinks.push(d.post_url);
      continue;
    }
    await db(
      `fb_post_performance?account=eq.${encodeURIComponent(a.username)}&post_id=eq.${row.post_id}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ delivery_id: d.id, carousel_id: d.source_id }),
      },
    );
    report.matched += 1;
  }
  return report;
}

export async function runFacebookIngest(mode: RunMode = modeFor(new Date())): Promise<RunReport> {
  const startedAt = new Date().toISOString();
  const limits = PAGE_LIMITS[mode];
  const credits: Credits = { used: 0, remaining: null };
  const { accounts, deliveries } = await accountsToRead();
  const reports: AccountReport[] = [];
  // One account at a time: a handful of slow calls is fine once a day, and a
  // burst is what starved PostgREST when the TikTok ingest fired 35 at once.
  for (const a of accounts) {
    try {
      reports.push(await readAccount(a, deliveries, credits, startedAt, limits));
    } catch (err) {
      reports.push({
        account: a.username,
        profile: a.geelark_profile,
        reels: 0,
        withViews: 0,
        engagementRead: 0,
        matched: 0,
        unmatchedLinks: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { startedAt, mode, accounts: reports, creditsUsed: credits.used, creditsRemaining: credits.remaining };
}
