import { sbRest } from "@/lib/data/supabase";

/**
 * Top Posts (handover 2026-09-01): combined IG + TikTok, top 5 by views.
 * Thumbnails resolved via oEmbed and cached in post_thumbnails (raw_payload
 * cover URLs expire, so never render those directly).
 */
export interface TopPost {
  platform: "tiktok" | "instagram";
  account: string;
  postId: string;
  postUrl: string;
  views: number | null;
  engagement: number | null;
  postedAt: string;
  caption: string | null;
  thumbnailUrl: string | null;
}

interface RawPost {
  platform: string;
  account: string;
  post_id: string;
  post_url: string;
  views: number | null;
  total_engagement: number | null;
  posted_at: string;
  caption_snippet: string | null;
}

const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type TopRange = "week" | "month" | "all";

const RANGE_DAYS: Record<TopRange, number | null> = { week: 7, month: 30, all: null };

async function topRows(range: TopRange): Promise<RawPost[]> {
  // PostgREST can't UNION, so pull each table's top rows and merge in JS.
  const cols = "account,post_id,post_url,views,total_engagement,posted_at,caption_snippet";

  // Filter on posted_at, NOT week_of: week_of is the ingest-batch date and its
  // values land 1-2 days apart, so "latest week_of" was really "latest batch".
  const days = RANGE_DAYS[range];
  const filter = days
    ? `&posted_at=gte.${new Date(Date.now() - days * 86_400_000).toISOString()}`
    : "";

  const [tt, ig] = await Promise.all([
    sbRest<Omit<RawPost, "platform">[]>(
      `tt_post_performance?select=${cols}${filter}&order=views.desc.nullslast&limit=5`,
    ),
    sbRest<Omit<RawPost, "platform">[]>(
      `post_performance?select=${cols}${filter}&order=views.desc.nullslast&limit=5`,
    ),
  ]);

  return [
    ...tt.map((r) => ({ ...r, platform: "tiktok" })),
    ...ig.map((r) => ({ ...r, platform: "instagram" })),
  ]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 5);
}

// Thumbnails come from expiring CDN URLs, so re-resolve anything older than this.
const THUMB_TTL_MS = 3 * 86_400_000;

/** Recursively find the first string value for any of the given keys. */
function deepFind(obj: unknown, keys: string[], depth = 0): string | null {
  if (depth > 6 || obj === null || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const r = deepFind(v, keys, depth + 1);
      if (r) return r;
    }
    return null;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (keys.includes(k) && typeof v === "string" && v.startsWith("http")) return v;
    const r = deepFind(v, keys, depth + 1);
    if (r) return r;
  }
  return null;
}

async function resolveViaTikTok(postUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(postUrl)}`, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { thumbnail_url?: string };
    return body.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

async function resolveViaScrapeCreators(postUrl: string): Promise<string | null> {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.scrapecreators.com/v1/instagram/post?url=${encodeURIComponent(postUrl)}`,
      { headers: { "x-api-key": key }, signal: AbortSignal.timeout(12_000), cache: "no-store" },
    );
    if (!res.ok) return null;
    const body = await res.json();
    return deepFind(body.data ?? body, ["display_url", "thumbnail_src", "thumbnail_url"]);
  } catch {
    return null;
  }
}

/** Resolve a thumbnail for one post, cached in post_thumbnails (with TTL). */
async function resolveThumbnail(post: RawPost): Promise<string | null> {
  // Fresh cache hit?
  try {
    const cached = await sbRest<{ thumbnail_url: string | null; resolved_at: string }[]>(
      `post_thumbnails?select=thumbnail_url,resolved_at&post_id=eq.${encodeURIComponent(post.post_id)}`,
    );
    const row = cached[0];
    if (row && Date.now() - new Date(row.resolved_at).getTime() < THUMB_TTL_MS) {
      return row.thumbnail_url;
    }
  } catch {
    /* fall through to resolve */
  }

  const url =
    post.platform === "tiktok"
      ? await resolveViaTikTok(post.post_url)
      : await resolveViaScrapeCreators(post.post_url);

  // Persist (even null, so we don't hammer the resolver every load).
  try {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/post_thumbnails`, {
      method: "POST",
      headers: {
        apikey: KEY(),
        Authorization: `Bearer ${KEY()}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        post_id: post.post_id,
        platform: post.platform,
        thumbnail_url: url,
        resolved_at: new Date().toISOString(),
      }),
      cache: "no-store",
    });
  } catch {
    /* non-fatal */
  }
  return url;
}

export async function getTopPosts(range: TopRange): Promise<TopPost[]> {
  const rows = await topRows(range);
  const thumbs = await Promise.all(rows.map(resolveThumbnail));
  return rows.map((r, i) => ({
    platform: r.platform === "instagram" ? "instagram" : "tiktok",
    account: r.account,
    postId: r.post_id,
    postUrl: r.post_url,
    views: r.views,
    engagement: r.total_engagement,
    postedAt: r.posted_at,
    caption: r.caption_snippet,
    thumbnailUrl: thumbs[i],
  }));
}
