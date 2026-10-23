import { accountAnalyticsTag } from "@/lib/data/account-analytics";
import type { AccountDeep, Audience, CarouselRow, CurvePoint, ForYou, HookPost, HookTypeRow, NamedPct, Watching, WeekValue } from "@/lib/data/account-deep";
import { ACCOUNT_ANALYTICS_TAG, TTL, cachedFetcher, type Cached } from "@/lib/data/cache";
import { sbRestAll } from "@/lib/data/supabase";
import { type AnalyticsPlatform, perfTable } from "@/lib/platform";

/**
 * DA-09, the real numbers behind the Deep side (the design is
 * account-deep.ts; approved 2026-10-23). Three tables meet here for one
 * account and one period:
 *   - the platform's performance table (DA-01): every post, its views and,
 *     on Instagram, its skip rate, reach, follows and profile visits;
 *   - content_tags (DA-03): each post's hook words and hook family, joined by
 *     the post's carousel_id = the tag's content_id;
 *   - post_screen_readings (DA-08): what the phone robot read off the post's
 *     own analytics screen, newest reading per post.
 *
 * Everything is computed in `buildDeep`, which is pure and tested. Empty is
 * not 0: a number no post in the period has is null, and every reading-based
 * figure says how many posts it rests on.
 */

/** Period the Deep side covers: "this month". */
export const DEEP_DAYS = 30;

export interface DeepPost {
  postId: string;
  postUrl: string | null;
  postedAt: string;
  format: string | null;
  caption: string | null;
  contentId: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  skipRate: number | null;
  follows: number | null;
}

export interface DeepTag {
  contentId: string;
  hookText: string | null;
  hookFamily: string | null;
  hookType: string | null;
}

export interface DeepReading {
  postUrl: string | null;
  readAt: string;
  viewers: number | null;
  newFollowers: number | null;
  avgWatchS: number | null;
  watchedFullPct: number | null;
  dropOffS: number | null;
  retentionCurve: CurvePoint[] | null;
  followersPct: number | null;
  newViewersPct: number | null;
  trafficSources: Record<string, number> | null;
  audienceAge: Record<string, number> | null;
  audienceCountry: Record<string, number> | null;
  audienceGender: Record<string, number> | null;
  fypRestricted: boolean | null;
}

// ---------------------------------------------------------------------------
// Small sums
// ---------------------------------------------------------------------------

const present = (vs: (number | null | undefined)[]) => vs.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function mean(vs: (number | null | undefined)[]): number | null {
  const have = present(vs);
  return have.length ? round1(have.reduce((a, b) => a + b, 0) / have.length) : null;
}

export function median(vs: (number | null | undefined)[]): number | null {
  const have = present(vs).sort((a, b) => a - b);
  if (!have.length) return null;
  const mid = Math.floor(have.length / 2);
  return have.length % 2 ? have[mid]! : round1((have[mid - 1]! + have[mid]!) / 2);
}

/** % still watching at second s, read off a curve between its points; null past its end. */
export function curveAt(curve: CurvePoint[] | null, s: number): number | null {
  if (!curve || curve.length < 2) return null;
  const pts = [...curve].sort((a, b) => a.s - b.s);
  if (s < pts[0]!.s || s > pts[pts.length - 1]!.s) return null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (s <= b.s) {
      if (b.s === a.s) return round1(b.pct);
      return round1(a.pct + ((b.pct - a.pct) * (s - a.s)) / (b.s - a.s));
    }
  }
  return null;
}

/**
 * One curve from many: at each second, the average of the curves that reach
 * that far. Runs to the median length of the curves, so a single long video
 * does not drag the tail out alone; at most 60 seconds, thinned to about two
 * dozen points for drawing.
 */
export function averageCurve(curves: CurvePoint[][]): CurvePoint[] {
  const usable = curves.filter((c) => c.length >= 2);
  if (!usable.length) return [];
  const ends = usable.map((c) => Math.max(...c.map((p) => p.s)));
  const end = Math.min(60, Math.floor(median(ends) ?? 0));
  if (end < 1) return [];
  const step = end <= 24 ? 1 : end <= 48 ? 2 : 3;
  const out: CurvePoint[] = [];
  for (let s = 0; s <= end; s += step) {
    const at = usable.map((c) => curveAt(c, s)).filter((v): v is number => v !== null);
    if (at.length) out.push({ s, pct: round1(at.reduce((a, b) => a + b, 0) / at.length) });
  }
  if (out.length && out[out.length - 1]!.s !== end) {
    const at = usable.map((c) => curveAt(c, end)).filter((v): v is number => v !== null);
    if (at.length) out.push({ s: end, pct: round1(at.reduce((a, b) => a + b, 0) / at.length) });
  }
  return out;
}

/** {name: pct} lists averaged over the readings that have one; a name a reading lacks counts as 0 there. */
export function averageNamed(dicts: (Record<string, number> | null)[], top?: number, order?: string[]): NamedPct[] {
  const have = dicts.filter((d): d is Record<string, number> => !!d && Object.keys(d).length > 0);
  if (!have.length) return [];
  const sums = new Map<string, number>();
  for (const d of have) for (const [name, pct] of Object.entries(d)) if (Number.isFinite(pct)) sums.set(name, (sums.get(name) ?? 0) + pct);
  let items = [...sums.entries()].map(([name, sum]) => ({ name, pct: round1(sum / have.length) }));
  if (order) {
    const rank = (n: string) => {
      const i = order.indexOf(n);
      return i < 0 ? order.length : i;
    };
    items.sort((a, b) => rank(a.name) - rank(b.name) || b.pct - a.pct);
  } else items.sort((a, b) => b.pct - a.pct);
  if (top) items = items.slice(0, top);
  return items;
}

/** "talking_to" → "talking to": the family as DA-03 stores it, in words. */
export const familyLabel = (family: string) => family.replace(/[_:]+/g, " ").trim();

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

/** The Monday a date falls in, as "Oct 6", New York time, for the weekly trend lines. */
export function weekOf(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d.getTime() - day * 86_400_000);
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// ---------------------------------------------------------------------------
// The build (pure; tested in account-deep-build.test.ts)
// ---------------------------------------------------------------------------

interface Joined {
  post: DeepPost;
  tag: DeepTag | null;
  reading: DeepReading | null;
  /** % still watching past 3 s: the reading's curve, else Instagram's own skip rate. */
  held: number | null;
}

function join(posts: DeepPost[], tags: DeepTag[], readings: DeepReading[], platform: AnalyticsPlatform): Joined[] {
  const tagById = new Map(tags.map((t) => [t.contentId, t]));
  const readingByUrl = new Map<string, DeepReading>();
  for (const r of [...readings].sort((a, b) => Date.parse(b.readAt) - Date.parse(a.readAt))) {
    if (r.postUrl && !readingByUrl.has(r.postUrl)) readingByUrl.set(r.postUrl, r);
  }
  return posts.map((post) => {
    const tag = post.contentId ? (tagById.get(post.contentId) ?? null) : null;
    const reading = post.postUrl ? (readingByUrl.get(post.postUrl) ?? null) : null;
    const fromCurve = curveAt(reading?.retentionCurve ?? null, 3);
    const held = fromCurve ?? (platform === "instagram" && post.skipRate !== null && (post.views ?? 0) > 0 ? round1(100 - post.skipRate) : null);
    return { post, tag, reading, held };
  });
}

function per100(num: (number | null)[], den: (number | null)[]): number | null {
  let n = 0;
  let d = 0;
  for (let i = 0; i < num.length; i++) {
    const a = num[i];
    const b = den[i];
    if (a === null || b === null || b === undefined || a === undefined || b <= 0) continue;
    n += a;
    d += b;
  }
  return d > 0 ? round1((n / d) * 100) : null;
}

function hooksByFamily(rows: Joined[]): HookTypeRow[] {
  const groups = new Map<string, Joined[]>();
  for (const r of rows) {
    const family = r.tag?.hookFamily ?? r.tag?.hookType ?? null;
    if (!family) continue;
    const key = familyLabel(family);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.entries()]
    .map(([type, g]): HookTypeRow => ({
      type,
      posts: g.length,
      medianViews: median(g.map((r) => r.post.views)),
      hookRate: mean(g.map((r) => r.held)),
      dropOffSec: median(g.map((r) => r.reading?.dropOffS ?? null)),
      followsPer100: per100(
        g.map((r) => r.post.follows ?? r.reading?.newFollowers ?? null),
        g.map((r) => r.post.reach ?? r.reading?.viewers ?? null),
      ),
    }))
    .sort((a, b) => (b.medianViews ?? -1) - (a.medianViews ?? -1) || b.posts - a.posts);
}

function bestAndWorst(rows: Joined[]): { best: HookPost[]; worst: HookPost[] } {
  const scored = rows
    .filter((r) => r.held !== null && (r.tag?.hookText || r.post.caption))
    .sort((a, b) => (b.held as number) - (a.held as number));
  if (scored.length < 2) return { best: [], worst: [] };
  const toPost = (r: Joined): HookPost => ({
    postUrl: r.post.postUrl,
    hookText: (r.tag?.hookText || r.post.caption || "").trim(),
    type: familyLabel(r.tag?.hookFamily ?? r.tag?.hookType ?? "untagged"),
    postedAt: r.post.postedAt,
    views: r.post.views,
    hookRate: r.held,
  });
  // Up to three each, never the same post on both sides: with few posts the
  // top half is "best" and the bottom half "worst".
  const n = scored.length;
  const bestCount = Math.min(3, Math.ceil(n / 2));
  const worstCount = Math.min(3, Math.floor(n / 2));
  const best = scored.slice(0, bestCount);
  const worst = scored.slice(n - worstCount).reverse();
  return { best: best.map(toPost), worst: worst.map(toPost) };
}

function carouselsByFamily(rows: Joined[]): CarouselRow[] {
  const groups = new Map<string, Joined[]>();
  for (const r of rows) {
    if (r.post.format !== "carousel" && r.post.format !== "photo") continue;
    const family = r.tag?.hookFamily ?? r.tag?.hookType ?? null;
    if (!family) continue;
    const key = familyLabel(family);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.entries()]
    .map(([type, g]): CarouselRow => {
      const reach = g.map((r) => r.post.reach ?? r.reading?.viewers ?? null);
      return {
        type,
        posts: g.length,
        medianReach: median(reach),
        savesPer100: per100(g.map((r) => r.post.saves), reach),
        sharesPer100: per100(g.map((r) => r.post.shares), reach),
        followsPer100: per100(g.map((r) => r.post.follows ?? r.reading?.newFollowers ?? null), reach),
      };
    })
    .sort((a, b) => (b.medianReach ?? -1) - (a.medianReach ?? -1));
}

function weekly(rows: Joined[], value: (r: Joined) => number | null): WeekValue[] {
  const byWeek = new Map<string, { at: number; values: number[] }>();
  for (const r of rows) {
    const v = value(r);
    if (v === null) continue;
    const week = weekOf(r.post.postedAt);
    const entry = byWeek.get(week) ?? { at: Date.parse(r.post.postedAt), values: [] };
    entry.values.push(v);
    entry.at = Math.min(entry.at, Date.parse(r.post.postedAt));
    byWeek.set(week, entry);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[1].at - b[1].at)
    .map(([week, e]) => ({ week, value: mean(e.values) }));
}

function watching(rows: Joined[]): Watching | null {
  const read = rows.filter((r) => r.reading !== null);
  if (!read.length) return null;
  const curves = read.map((r) => r.reading?.retentionCurve ?? null).filter((c): c is CurvePoint[] => !!c && c.length >= 2);
  return {
    readPosts: read.length,
    avgWatchSec: mean(read.map((r) => r.reading?.avgWatchS ?? null)),
    watchedFullPct: mean(read.map((r) => r.reading?.watchedFullPct ?? null)),
    heldPct: mean(read.map((r) => curveAt(r.reading?.retentionCurve ?? null, 3))),
    dropOffSec: median(read.map((r) => r.reading?.dropOffS ?? null)),
    curve: averageCurve(curves),
    weekly: {
      avgWatchSec: weekly(read, (r) => r.reading?.avgWatchS ?? null),
      watchedFullPct: weekly(read, (r) => r.reading?.watchedFullPct ?? null),
      heldPct: weekly(read, (r) => curveAt(r.reading?.retentionCurve ?? null, 3)),
      dropOffSec: weekly(read, (r) => r.reading?.dropOffS ?? null),
    },
  };
}

function audience(rows: Joined[]): Audience | null {
  const read = rows.map((r) => r.reading).filter((r): r is DeepReading => r !== null);
  const have = read.filter((r) => r.followersPct !== null || r.newViewersPct !== null || r.audienceAge || r.audienceCountry || r.audienceGender);
  if (!have.length) return null;
  return {
    readPosts: have.length,
    followersPct: mean(have.map((r) => r.followersPct)),
    newViewersPct: mean(have.map((r) => r.newViewersPct)),
    age: averageNamed(have.map((r) => r.audienceAge), undefined, AGE_ORDER),
    country: averageNamed(have.map((r) => r.audienceCountry), 5),
    gender: averageNamed(have.map((r) => r.audienceGender)),
  };
}

function forYou(rows: Joined[], platform: AnalyticsPlatform): ForYou | null {
  if (platform !== "tiktok") return null;
  const judged = rows.filter((r) => r.reading?.fypRestricted !== null && r.reading?.fypRestricted !== undefined);
  if (!judged.length) return null;
  const held = judged.filter((r) => r.reading?.fypRestricted === true);
  return {
    videosRead: judged.length,
    held: held.length,
    heldPosts: held.map((r) => ({
      postUrl: r.post.postUrl,
      hookText: (r.tag?.hookText || r.post.caption || "(no caption)").trim(),
      postedAt: r.post.postedAt,
      views: r.post.views,
    })),
  };
}

export function buildDeep(posts: DeepPost[], tags: DeepTag[], readings: DeepReading[], platform: AnalyticsPlatform, now = new Date()): AccountDeep {
  const rows = join(posts, tags, readings, platform);
  const read = rows.filter((r) => r.reading !== null);
  const sourceReadings = read.map((r) => r.reading!).filter((r) => r.trafficSources && Object.keys(r.trafficSources).length);
  const latestRead = read.map((r) => Date.parse(r.reading!.readAt)).filter(Number.isFinite);
  const latestPost = posts.map((p) => Date.parse(p.postedAt)).filter(Number.isFinite);
  const asOf = latestRead.length ? new Date(Math.max(...latestRead)) : latestPost.length ? new Date(Math.max(...latestPost)) : now;
  const { best, worst } = bestAndWorst(rows);
  return {
    asOf: asOf.toISOString(),
    taggedPosts: rows.filter((r) => r.tag !== null).length,
    readPosts: read.length,
    totalPosts: posts.length,
    watching: watching(rows),
    sources: sourceReadings.length ? { readPosts: sourceReadings.length, items: averageNamed(sourceReadings.map((r) => r.trafficSources), 6) } : null,
    audience: audience(rows),
    forYou: forYou(rows, platform),
    hooks: hooksByFamily(rows),
    best,
    worst,
    carousels: carouselsByFamily(rows),
  };
}

// ---------------------------------------------------------------------------
// The fetch
// ---------------------------------------------------------------------------

interface RawPost {
  post_id: string;
  post_url: string | null;
  posted_at: string;
  format: string | null;
  caption_snippet: string | null;
  carousel_id: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach?: number | null;
  skip_rate?: number | string | null;
  follows?: number | null;
}

interface RawTag {
  content_id: string;
  hook_text: string | null;
  hook_family: string | null;
  hook_type: string | null;
}

interface RawReading {
  post_url: string | null;
  read_at: string;
  viewers: number | null;
  new_followers: number | null;
  avg_watch_s: number | string | null;
  watched_full_pct: number | string | null;
  drop_off_s: number | string | null;
  retention_curve: CurvePoint[] | null;
  followers_pct: number | string | null;
  new_viewers_pct: number | string | null;
  traffic_sources: Record<string, number> | null;
  audience_age: Record<string, number> | null;
  audience_country: Record<string, number> | null;
  audience_gender: Record<string, number> | null;
  fyp_restricted: boolean | null;
}

const num = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v));

export function toDeepPost(r: RawPost): DeepPost {
  return {
    postId: r.post_id,
    postUrl: r.post_url,
    postedAt: r.posted_at,
    format: r.format,
    caption: r.caption_snippet,
    contentId: r.carousel_id,
    views: num(r.views),
    likes: num(r.likes),
    comments: num(r.comments),
    shares: num(r.shares),
    saves: num(r.saves),
    reach: num(r.reach),
    skipRate: num(r.skip_rate),
    follows: num(r.follows),
  };
}

export function toDeepReading(r: RawReading): DeepReading {
  return {
    postUrl: r.post_url,
    readAt: r.read_at,
    viewers: num(r.viewers),
    newFollowers: num(r.new_followers),
    avgWatchS: num(r.avg_watch_s),
    watchedFullPct: num(r.watched_full_pct),
    dropOffS: num(r.drop_off_s),
    retentionCurve: Array.isArray(r.retention_curve) ? r.retention_curve : null,
    followersPct: num(r.followers_pct),
    newViewersPct: num(r.new_viewers_pct),
    trafficSources: r.traffic_sources,
    audienceAge: r.audience_age,
    audienceCountry: r.audience_country,
    audienceGender: r.audience_gender,
    fypRestricted: typeof r.fyp_restricted === "boolean" ? r.fyp_restricted : null,
  };
}

async function fetchAccountDeep(account: string, platform: AnalyticsPlatform): Promise<AccountDeep> {
  const since = new Date(Date.now() - DEEP_DAYS * 86_400_000).toISOString();
  const cols = "post_id,post_url,posted_at,format,caption_snippet,carousel_id,views,likes,comments,shares,saves" + (platform === "instagram" ? ",reach,skip_rate,follows" : "");
  const [rawPosts, rawReadings] = await Promise.all([
    sbRestAll<RawPost>(
      `${perfTable(platform)}?select=${cols}&account=eq.${encodeURIComponent(account)}&posted_at=gte.${encodeURIComponent(since)}&order=posted_at.desc`,
    ),
    sbRestAll<RawReading>(
      "post_screen_readings?select=post_url,read_at,viewers,new_followers,avg_watch_s,watched_full_pct,drop_off_s,retention_curve,followers_pct,new_viewers_pct,traffic_sources,audience_age,audience_country,audience_gender,fyp_restricted" +
        `&account=eq.${encodeURIComponent(account)}&platform=eq.${platform}&post_url=not.is.null&order=read_at.desc`,
    ),
  ]);
  const ids = [...new Set(rawPosts.map((p) => p.carousel_id).filter((id): id is string => !!id))];
  const rawTags: RawTag[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const list = ids.slice(i, i + 100).map((id) => `"${id.replace(/"/g, "")}"`).join(",");
    rawTags.push(...(await sbRestAll<RawTag>(`content_tags?select=content_id,hook_text,hook_family,hook_type&content_id=in.(${encodeURIComponent(list)})`)));
  }
  return buildDeep(
    rawPosts.map(toDeepPost),
    rawTags.map((t) => ({ contentId: t.content_id, hookText: t.hook_text, hookFamily: t.hook_family, hookType: t.hook_type })),
    rawReadings.map(toDeepReading),
    platform,
  );
}

/** Same tags as the Analytics and All posts tabs, so Refresh expires all three together. */
export function getAccountDeep(account: string, platform: AnalyticsPlatform): Promise<Cached<AccountDeep>> {
  return cachedFetcher(`account-deep-v1:${account}:${platform}`, TTL.supabase, () => fetchAccountDeep(account, platform), {
    tags: [ACCOUNT_ANALYTICS_TAG, accountAnalyticsTag(account)],
  })();
}
