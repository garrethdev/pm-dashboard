/**
 * DA-05 / DA-08: read the numbers off each app's own analytics screen.
 * docs/DEEP-ANALYTICS-TICKETS.md.
 *
 * A "reading" is one post's analytics screens (a handful of phone
 * screenshots, scrolled from top to bottom, every tab) turned into one row of
 * `post_screen_readings`. The AI looks at every screenshot of the post at once
 * and fills a fixed form; the pure half of this file turns that form into the
 * row, enforcing the one rule that matters here:
 *
 *   EMPTY IS NOT 0. "--", "not enough data", "shown when this video reaches
 *   100 views" and a tab that was never opened are all null. 0 means the
 *   screen said 0.
 *
 * The screens were settled by Yurie's screenshots (2026-10-23): TikTok's
 * Video analysis (Overview, Viewers, Engagement; the Inspiration tab is
 * TikTok's own trending list and is ignored), Instagram's Post / Reel insights
 * (Overview, Engagement, Audience) and Facebook's Post details.
 *
 * The AI is Claude Haiku 5.5 through OpenRouter, the same door and key as
 * DA-03 (OPENROUTER_API_KEY, which production already has). Haiku because on
 * the first five posts Haiku, Sonnet and Opus read every number the same and
 * Haiku costs a fiftieth of Opus (Garreth, 2026-10-23). SCREEN_READINGS_MODEL
 * overrides it.
 */

export const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";
export type Platform = "tiktok" | "instagram" | "facebook";
export type ReadBy = "manual" | "robot";

/** $ per million tokens, in and out, for the models worth trying here (OpenRouter names). */
export const PRICES: Record<string, { input: number; output: number }> = {
  "anthropic/claude-opus-5.5": { input: 4, output: 20 },
  "anthropic/claude-sonnet-5.5": { input: 2, output: 10 },
  "anthropic/claude-haiku-5.5": { input: 0.1, output: 0.5 },
};

export interface Screenshot {
  /** File name or storage path; kept on the row so a wrong read can be checked. */
  name: string;
  data: Buffer;
  mediaType: "image/jpeg" | "image/png";
}

/** One post's screens plus what the person or robot knows about the post. */
export interface ScreenGroup {
  platform: Platform;
  account: string;
  postUrl?: string | null;
  postId?: string | null;
  /** 'video' | 'photo' | 'carousel', as the performance tables store it. */
  format?: string | null;
  postedAt?: string | null;
  captionSnippet?: string | null;
  readBy?: ReadBy;
  screenshots: Screenshot[];
}

// ---------------------------------------------------------------------------
// The form the AI fills
// ---------------------------------------------------------------------------

const nullable = (type: string) => ({ type: [type, "null"] });
const namedPct = {
  type: ["array", "null"],
  items: {
    type: "object",
    properties: { name: { type: "string" }, pct: { type: "number" } },
    required: ["name", "pct"],
    additionalProperties: false,
  },
};

/**
 * JSON schema for the AI's reply. Every field is present and nullable, so a
 * missing number is a deliberate null, never an omission. Lists of named
 * percentages are arrays here (JSON schema cannot describe free keys) and
 * become objects on the row.
 */
export const READING_SCHEMA = {
  type: "object",
  properties: {
    screens_seen: { type: "array", items: { type: "string" } },
    format: { anyOf: [{ type: "string", enum: ["video", "photo", "carousel"] }, { type: "null" }] },
    posted_at_text: nullable("string"),
    views: nullable("integer"),
    views_instagram: nullable("integer"),
    views_facebook: nullable("integer"),
    viewers: nullable("integer"),
    likes: nullable("integer"),
    comments: nullable("integer"),
    shares: nullable("integer"),
    saves: nullable("integer"),
    reposts: nullable("integer"),
    new_followers: nullable("integer"),
    profile_visits: nullable("integer"),
    avg_watch_s: nullable("number"),
    total_watch_s: nullable("number"),
    watched_full_pct: nullable("number"),
    retention_avg_pct: nullable("number"),
    drop_off_s: nullable("number"),
    skip_rate_pct: nullable("number"),
    retention_curve: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: { s: { type: "number" }, pct: { type: "number" } },
        required: ["s", "pct"],
        additionalProperties: false,
      },
    },
    followers_pct: nullable("number"),
    new_viewers_pct: nullable("number"),
    traffic_sources: namedPct,
    audience_age: namedPct,
    audience_country: namedPct,
    audience_gender: namedPct,
    rate_signals: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          pct: { type: "number" },
          vs_typical: { anyOf: [{ type: "string", enum: ["lower", "typical", "higher"] }, { type: "null" }] },
        },
        required: ["name", "pct", "vs_typical"],
        additionalProperties: false,
      },
    },
    fyp_restricted: nullable("boolean"),
    notes: nullable("string"),
  },
  required: [
    "screens_seen", "format", "posted_at_text",
    "views", "views_instagram", "views_facebook", "viewers",
    "likes", "comments", "shares", "saves", "reposts", "new_followers", "profile_visits",
    "avg_watch_s", "total_watch_s", "watched_full_pct", "retention_avg_pct", "drop_off_s", "skip_rate_pct",
    "retention_curve", "followers_pct", "new_viewers_pct",
    "traffic_sources", "audience_age", "audience_country", "audience_gender", "rate_signals",
    "fyp_restricted", "notes",
  ],
  additionalProperties: false,
} as const;

const RULES = `You are reading screenshots of one social media post's analytics screens, taken on a phone and scrolled from top to bottom, possibly across several tabs. Fill in the form from what is on the screens.

Rules:
- Empty is not 0. If a number shows as "--", "-", "not enough data", "will be shown when this video reaches 100 views", "not ready yet", or the screen that would hold it is not among the screenshots, the field is null. Write 0 only when the screen shows 0.
- Copy numbers exactly as shown. Percentages are numbers without the % sign (57.0% is 57). Times are seconds (0h:01m:37s is 97; 4.7s is 4.7; "stopped watching at 0:01" is 1).
- Two screenshots may show the same part of the screen, or overlap. Read each number once.
- Lists of names with percentages (sources of views, age bands, countries, gender) become arrays of {name, pct} in the order shown. Use the label as written on screen.
- The retention curve is a line graph of "% still watching" against time ("Retention rate" on TikTok, "How long people watched your reel" on Instagram, "Retention" on Facebook). Read about eight points, evenly spaced from the start of the x axis to its end, as {s, pct}. The first point is {s: 0, pct: 100}. Be approximate rather than skip it. Do not confuse it with "Views over time" (views per day) or "When people liked" (likes against time): those are not retention and are not recorded.
- A "Views over time" graph is not recorded, only the totals under it.
- notes: one or two short sentences on anything you could not read, anything cut off, or anything unusual on the screen (a warning, a banner). Null if nothing.
- screens_seen: a short label per screenshot in order, e.g. "tiktok overview top", "instagram audience country".`;

const PLATFORM_HINTS: Record<Platform, string> = {
  tiktok: `These are TikTok "Video analysis" screens: tabs Inspiration, Overview, Viewers, Engagement.
- Ignore the Inspiration tab entirely (it lists other people's trending videos).
- Overview: the row of icons under the thumbnail is views, likes, comments, shares, saves. "Key metrics": Video views (views), Total play time (total_watch_s), Average watch time (avg_watch_s), Watched full video (watched_full_pct), New followers (new_followers). "Retention rate": "viewers watched N% of your video" (retention_avg_pct), "Most viewers stopped watching at 0:0N" (drop_off_s), and the curve. "Traffic sources" go to traffic_sources (null when it says data will be shown at 100 views).
- Viewers: "Total viewers" (viewers). "Viewer types": the New viewers % (new_viewers_pct) and the Followers % (followers_pct). Gender, Age, Locations go to audience_gender, audience_age, audience_country (null when hidden).
- fyp_restricted: true if a banner says the video "is not eligible for recommendation in the For You feed" (or similar wording about a content restriction). false if the Overview tab's top is among the screens and no such banner is on it. null if the top of the Overview tab is not among the screens.
- views_instagram, views_facebook, skip_rate_pct, rate_signals, reposts, profile_visits are never on TikTok: null.`,
  instagram: `These are Instagram "Post insights" or "Reel insights" screens: tabs Overview, Engagement, Audience.
- The row of icons under the thumbnail is likes, comments, reposts, shares, saves.
- Overview "Summary": Views (views), Viewers (viewers), Profile visits (profile_visits), Follows (new_followers), Average watch time (avg_watch_s; Reels only). "Crossposted to Facebook" means the Views list under the "Views over time" graph splits Instagram and Facebook: those go to views_instagram and views_facebook; views is the total.
- Reels: "What impacts your views" lists Skip rate, Share rate, Like rate, Save rate, Repost rate, Comment rate, each with Lower / Typical / Higher under it. Put them all in rate_signals as {name, pct, vs_typical} and also copy Skip rate to skip_rate_pct. "How long people watched your reel" is the retention curve (x axis 0:00 to the reel's length).
- "Top sources of views" goes to traffic_sources.
- Engagement: "Actions after viewing" (Profile visits, Follows), "Interactions" (Likes and reactions, Comments, Reposts, Shares, Saves: use the big total, not the Instagram/Facebook split). "When people liked your carousel/reel" is not recorded.
- Audience: "Who viewed your post/reel" Followers % (followers_pct). "Audience details" Age, Country, Gender go to audience_age, audience_country, audience_gender; null when it says demographics are not available.
- total_watch_s, watched_full_pct, retention_avg_pct, drop_off_s, new_viewers_pct, fyp_restricted are never on Instagram: null.`,
  facebook: `These are Facebook "Post details" screens for a profile in professional mode.
- Top tiles: Views (views), Engagement (ignore the tile; use the lists below), Net follows (new_followers; "--" is null).
- "N Facebook views" with Viewers (viewers) and "Instagram views" (views_instagram, the crossposted original). views_facebook is the Facebook views number. "Retention" is the retention curve when it shows one. "Views breakdown": Views and 3-second views (3-second views are not recorded). "Where your views came from": Traffic and Source cards go to traffic_sources when they hold data.
- "N Engagement": the "Facebook engagement" card (Reactions = likes, Comments, Shares, Saves, Clicks: clicks are not recorded) is what counts; the "Instagram interactions" card is the original's and is not recorded.
- "Followers vs. non-followers" goes to followers_pct when it shows a number. "Demographics" Age and gender, Countries go to audience_age/audience_gender, audience_country when they hold data.
- avg_watch_s, total_watch_s, watched_full_pct, retention_avg_pct, drop_off_s, skip_rate_pct, rate_signals, reposts, profile_visits, new_viewers_pct, fyp_restricted are never on Facebook: null.`,
};

export function promptFor(platform: Platform): string {
  return `${RULES}\n\n${PLATFORM_HINTS[platform]}`;
}

// ---------------------------------------------------------------------------
// The row (pure; tested in screen-readings.test.ts)
// ---------------------------------------------------------------------------

export interface ReadingRow {
  platform: Platform;
  account: string;
  post_url: string | null;
  post_id: string | null;
  format: string | null;
  posted_at: string | null;
  caption_snippet: string | null;
  read_by: ReadBy;
  screenshots: string[];
  views: number | null;
  views_instagram: number | null;
  views_facebook: number | null;
  viewers: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reposts: number | null;
  new_followers: number | null;
  profile_visits: number | null;
  avg_watch_s: number | null;
  total_watch_s: number | null;
  watched_full_pct: number | null;
  retention_avg_pct: number | null;
  drop_off_s: number | null;
  skip_rate_pct: number | null;
  retention_curve: { s: number; pct: number }[] | null;
  followers_pct: number | null;
  new_viewers_pct: number | null;
  traffic_sources: Record<string, number> | null;
  audience_age: Record<string, number> | null;
  audience_country: Record<string, number> | null;
  audience_gender: Record<string, number> | null;
  rate_signals: Record<string, { pct: number; vs_typical: string | null }> | null;
  fyp_restricted: boolean | null;
  notes: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  raw: unknown;
}

type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict => typeof v === "object" && v !== null && !Array.isArray(v);

/** A finite number, or null. Strings like "57%" and "1,234" are read; anything else is null. */
export function numOrNull(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.replace(/[%,\s]/g, ""));
    return v.trim() !== "" && Number.isFinite(n) ? n : null;
  }
  return null;
}

/** A whole number, or null. 4.7 is not a count. */
export function intOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  return n !== null && Number.isInteger(n) ? n : null;
}

/** [{name, pct}] → {name: pct}; empty, missing or malformed → null. */
export function namedPctOrNull(v: unknown): Record<string, number> | null {
  if (!Array.isArray(v)) return null;
  const out: Record<string, number> = {};
  for (const item of v) {
    if (!isDict(item) || typeof item.name !== "string") continue;
    const pct = numOrNull(item.pct);
    if (pct === null) continue;
    out[item.name.trim()] = pct;
  }
  return Object.keys(out).length ? out : null;
}

/** [{s, pct}] in time order; null unless at least two readable points. */
export function curveOrNull(v: unknown): { s: number; pct: number }[] | null {
  if (!Array.isArray(v)) return null;
  const points: { s: number; pct: number }[] = [];
  for (const item of v) {
    if (!isDict(item)) continue;
    const s = numOrNull(item.s);
    const pct = numOrNull(item.pct);
    if (s === null || pct === null) continue;
    points.push({ s, pct });
  }
  points.sort((a, b) => a.s - b.s);
  return points.length >= 2 ? points : null;
}

export function rateSignalsOrNull(v: unknown): ReadingRow["rate_signals"] {
  if (!Array.isArray(v)) return null;
  const out: NonNullable<ReadingRow["rate_signals"]> = {};
  for (const item of v) {
    if (!isDict(item) || typeof item.name !== "string") continue;
    const pct = numOrNull(item.pct);
    if (pct === null) continue;
    const vs = item.vs_typical;
    out[item.name.trim()] = { pct, vs_typical: vs === "lower" || vs === "typical" || vs === "higher" ? vs : null };
  }
  return Object.keys(out).length ? out : null;
}

/** The AI's form → the row. What the group already knows about the post wins over what the AI read. */
export function toRow(ai: unknown, group: Omit<ScreenGroup, "screenshots">, screenshots: string[]): ReadingRow {
  const a: Dict = isDict(ai) ? ai : {};
  const fmt = a.format;
  return {
    platform: group.platform,
    account: group.account,
    post_url: group.postUrl ?? null,
    post_id: group.postId ?? null,
    format: group.format ?? (fmt === "video" || fmt === "photo" || fmt === "carousel" ? fmt : null),
    posted_at: group.postedAt ?? null,
    caption_snippet: group.captionSnippet ?? null,
    read_by: group.readBy ?? "manual",
    screenshots,
    views: intOrNull(a.views),
    views_instagram: intOrNull(a.views_instagram),
    views_facebook: intOrNull(a.views_facebook),
    viewers: intOrNull(a.viewers),
    likes: intOrNull(a.likes),
    comments: intOrNull(a.comments),
    shares: intOrNull(a.shares),
    saves: intOrNull(a.saves),
    reposts: intOrNull(a.reposts),
    new_followers: intOrNull(a.new_followers),
    profile_visits: intOrNull(a.profile_visits),
    avg_watch_s: numOrNull(a.avg_watch_s),
    total_watch_s: numOrNull(a.total_watch_s),
    watched_full_pct: numOrNull(a.watched_full_pct),
    retention_avg_pct: numOrNull(a.retention_avg_pct),
    drop_off_s: numOrNull(a.drop_off_s),
    skip_rate_pct: numOrNull(a.skip_rate_pct),
    retention_curve: curveOrNull(a.retention_curve),
    followers_pct: numOrNull(a.followers_pct),
    new_viewers_pct: numOrNull(a.new_viewers_pct),
    traffic_sources: namedPctOrNull(a.traffic_sources),
    audience_age: namedPctOrNull(a.audience_age),
    audience_country: namedPctOrNull(a.audience_country),
    audience_gender: namedPctOrNull(a.audience_gender),
    rate_signals: rateSignalsOrNull(a.rate_signals),
    fyp_restricted: typeof a.fyp_restricted === "boolean" ? a.fyp_restricted : null,
    notes: typeof a.notes === "string" && a.notes.trim() ? a.notes.trim() : null,
    model: null,
    input_tokens: null,
    output_tokens: null,
    cost_usd: null,
    raw: ai,
  };
}

export function costOf(model: string, inputTokens: number, outputTokens: number): number | null {
  const p = PRICES[model];
  if (!p) return null;
  return Math.round(((inputTokens * p.input + outputTokens * p.output) / 1_000_000) * 1e6) / 1e6;
}

// ---------------------------------------------------------------------------
// The AI
// ---------------------------------------------------------------------------

export interface ReadResult {
  row: ReadingRow;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  /** Why the AI gave nothing usable, if it did not. */
  problem: string | null;
}

/** The AI service itself failed (out of credit, busy, down): stop the run. */
export class AiUnavailable extends Error {}

/**
 * One request per post: every screenshot, then the form to fill. The form is
 * asked for in the prompt rather than enforced by a schema: the API's schema
 * grammar allows at most 16 nullable fields and this form has 29, every one of
 * them nullable on purpose.
 */
export async function readScreens(
  group: ScreenGroup,
  opts: { model?: string; screenshotPaths?: string[] } = {},
): Promise<ReadResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiUnavailable("The AI is not connected: OPENROUTER_API_KEY is not set");
  const model = opts.model ?? process.env.SCREEN_READINGS_MODEL ?? DEFAULT_MODEL;
  const paths = opts.screenshotPaths ?? group.screenshots.map((s) => s.name);
  const content: ({ type: "image_url"; image_url: { url: string } } | { type: "text"; text: string })[] =
    group.screenshots.map((s) => ({
      type: "image_url",
      image_url: { url: `data:${s.mediaType};base64,${s.data.toString("base64")}` },
    }));
  content.push({
    type: "text",
    text:
      `${promptFor(group.platform)}\n\nThere are ${group.screenshots.length} screenshots, in the order they were taken.\n\n` +
      `Reply with one JSON object and nothing else, matching this JSON schema exactly (every field present, null where the screen did not show it):\n${JSON.stringify(READING_SCHEMA)}`,
  });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pm-dashboard-ashen.vercel.app",
      "X-Title": "PM Dashboard Screen Readings",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (res.status === 401 || res.status === 402 || res.status === 429 || res.status >= 500) {
    throw new AiUnavailable(res.status === 402 ? "The AI account is out of credit" : `The AI could not be reached (HTTP ${res.status})`);
  }
  if (!res.ok) throw new Error(`the AI refused these screens (HTTP ${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const inputTokens = json.usage?.prompt_tokens ?? 0;
  const outputTokens = json.usage?.completion_tokens ?? 0;
  const costUsd = costOf(model, inputTokens, outputTokens);
  const stamp = (row: ReadingRow) => Object.assign(row, { model, input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: costUsd });

  const text = json.choices?.[0]?.message?.content ?? "";
  let parsed: unknown = null;
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("no JSON");
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    const row = stamp(toRow(null, group, paths));
    row.notes = `The AI's reply could not be read: ${text.slice(0, 160) || "(empty)"}`;
    return { row, model, inputTokens, outputTokens, costUsd, problem: row.notes };
  }
  return { row: stamp(toRow(parsed, group, paths)), model, inputTokens, outputTokens, costUsd, problem: null };
}

// ---------------------------------------------------------------------------
// Supabase: the bucket and the table
// ---------------------------------------------------------------------------

export const BUCKET = "post-screens";

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

/** Where a post's screenshots live in the bucket: platform/account/date/n-name. */
export function storagePath(group: Pick<ScreenGroup, "platform" | "account">, readAt: Date, index: number, name: string): string {
  const day = readAt.toISOString().slice(0, 10);
  const safe = name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "screen";
  return `${group.platform}/${group.account}/${day}/${String(index + 1).padStart(2, "0")}-${safe}`;
}

/** Keeps the screenshots so a wrong read can be checked. Returns the paths in order. */
export async function uploadScreens(group: ScreenGroup, readAt = new Date()): Promise<string[]> {
  const key = serviceKey();
  const paths: string[] = [];
  for (const [i, shot] of group.screenshots.entries()) {
    const path = storagePath(group, readAt, i, shot.name);
    const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": shot.mediaType, "x-upsert": "true" },
      body: new Uint8Array(shot.data),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`storage HTTP ${res.status} uploading ${path}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    paths.push(path);
  }
  return paths;
}

/** Inserts the reading and returns its id. */
export async function insertReading(row: ReadingRow): Promise<number> {
  const key = serviceKey();
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/post_screen_readings?select=id`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`supabase HTTP ${res.status} inserting the reading: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const [inserted] = (await res.json()) as { id: number }[];
  return inserted.id;
}

/**
 * What the platform's API fetch stored for the same post, in the reading's
 * own names, so the two can be laid side by side (DA-05's "do they match").
 * Null when the post is not in the performance table.
 */
export async function storedNumbersFor(platform: Platform, postUrl: string): Promise<Partial<Record<keyof ReadingRow, number | null>> | null> {
  const key = serviceKey();
  const table = { tiktok: "tt_post_performance", instagram: "post_performance", facebook: "fb_post_performance" }[platform];
  const cols = "views,likes,comments,shares,saves" + (platform === "instagram" ? ",reach,skip_rate,avg_watch_ms,follows,profile_visits" : "");
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/${table}?select=${cols}&post_url=eq.${encodeURIComponent(postUrl)}&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`supabase HTTP ${res.status} reading ${table}`);
  const [r] = (await res.json()) as Record<string, unknown>[];
  if (!r) return null;
  const n = numOrNull;
  const out: Partial<Record<keyof ReadingRow, number | null>> = {
    views: n(r.views), likes: n(r.likes), comments: n(r.comments), shares: n(r.shares), saves: n(r.saves),
  };
  if (platform === "instagram") {
    out.viewers = n(r.reach);
    out.skip_rate_pct = n(r.skip_rate);
    const ms = n(r.avg_watch_ms);
    out.avg_watch_s = ms ? Math.round(ms / 100) / 10 : null;
    out.new_followers = n(r.follows);
    out.profile_visits = n(r.profile_visits);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The robot's hand-off (DA-06): a list of posts whose screenshots are already
// in the bucket → one reading each
// ---------------------------------------------------------------------------

/** One post as the robot (or a person) describes it after uploading its screens. */
export interface RunPost {
  platform: Platform;
  account: string;
  /** The post's caption as the robot saw it on the post itself; how the post is matched. */
  caption?: string | null;
  /** The posted date as the analytics screen shows it, e.g. "Oct 16, 2026, 11:43 AM"; a tiebreaker. */
  posted_at_text?: string | null;
  /** Known only when a person is sending; the robot does not have it. */
  post_url?: string | null;
  /** Paths in the post-screens bucket, in the order taken. */
  screenshots: string[];
  /** Why the robot could not open the analytics, when it could not. */
  problem?: string | null;
}

export interface RunRequest {
  read_by: ReadBy;
  posts: RunPost[];
}

const PLATFORMS: Platform[] = ["tiktok", "instagram", "facebook"];
const isStr = (v: unknown): v is string => typeof v === "string";
const strOrNull = (v: unknown): string | null => (isStr(v) && v.trim() ? v.trim() : null);

/** The request body, checked field by field; throws with a plain message when it is not one. */
export function parseRunRequest(body: unknown): RunRequest {
  if (!isDict(body)) throw new Error("The body must be a JSON object with a posts list");
  const readBy = body.read_by === undefined ? "robot" : body.read_by;
  if (readBy !== "manual" && readBy !== "robot") throw new Error("read_by must be 'manual' or 'robot'");
  if (!Array.isArray(body.posts) || body.posts.length === 0) throw new Error("posts must be a non-empty list");
  if (body.posts.length > 60) throw new Error("At most 60 posts per call");
  const posts = body.posts.map((p, i): RunPost => {
    if (!isDict(p)) throw new Error(`posts[${i}] must be an object`);
    if (!PLATFORMS.includes(p.platform as Platform)) throw new Error(`posts[${i}].platform must be tiktok, instagram or facebook`);
    const account = strOrNull(p.account);
    if (!account) throw new Error(`posts[${i}].account is missing`);
    const shots = Array.isArray(p.screenshots) ? p.screenshots.filter(isStr).map((s) => s.trim()).filter(Boolean) : [];
    const problem = strOrNull(p.problem);
    if (shots.length === 0 && !problem) throw new Error(`posts[${i}] has no screenshots and no problem`);
    if (shots.length > 40) throw new Error(`posts[${i}] has more than 40 screenshots`);
    return {
      platform: p.platform as Platform,
      account,
      caption: strOrNull(p.caption),
      posted_at_text: strOrNull(p.posted_at_text),
      post_url: strOrNull(p.post_url),
      screenshots: shots,
      problem,
    };
  });
  return { read_by: readBy, posts };
}

/** The first forty letters and digits of a caption, lower-cased: enough to tell posts apart, blind to punctuation and emoji. */
export function captionKey(caption: string | null | undefined): string {
  return (caption ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ").slice(0, 40).trim();
}

export interface PostCandidate {
  post_id: string;
  post_url: string | null;
  posted_at: string;
  caption_snippet: string | null;
  format: string | null;
}

/**
 * Which stored post the robot read. Caption first (either side may be cut
 * short, so a prefix match either way counts); among several, the one posted
 * nearest the date on the screen, else the newest. Null when nothing matches.
 */
export function pickPost(candidates: PostCandidate[], caption: string | null | undefined, postedAtText?: string | null): PostCandidate | null {
  const key = captionKey(caption);
  if (!key) return null;
  // A short caption has to match whole: "The" must not pick the newest post
  // that starts with "the".
  const hits = candidates.filter((c) => {
    const ck = captionKey(c.caption_snippet);
    if (!ck) return false;
    if (key.length < 8 || ck.length < 8) return ck === key;
    return ck.startsWith(key) || key.startsWith(ck);
  });
  if (hits.length === 0) return null;
  const screen = postedAtText ? Date.parse(postedAtText) : NaN;
  const sorted = [...hits].sort((a, b) => {
    if (!Number.isNaN(screen)) {
      const da = Math.abs(Date.parse(a.posted_at) - screen);
      const db = Math.abs(Date.parse(b.posted_at) - screen);
      if (da !== db) return da - db;
    }
    return Date.parse(b.posted_at) - Date.parse(a.posted_at);
  });
  return sorted[0];
}

/** The account's posts from the last 45 days, newest first: the pool a reading is matched against. */
export async function recentPosts(platform: Platform, account: string): Promise<PostCandidate[]> {
  const key = serviceKey();
  const table = { tiktok: "tt_post_performance", instagram: "post_performance", facebook: "fb_post_performance" }[platform];
  const since = new Date(Date.now() - 45 * 86_400_000).toISOString();
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/${table}?select=post_id,post_url,posted_at,caption_snippet,format` +
      `&account=eq.${encodeURIComponent(account)}&posted_at=gte.${encodeURIComponent(since)}&order=posted_at.desc&limit=200`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`supabase HTTP ${res.status} reading ${table}`);
  return (await res.json()) as PostCandidate[];
}

/** One screenshot back out of the bucket. */
export async function downloadScreen(path: string): Promise<Screenshot> {
  const key = serviceKey();
  const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`screenshot ${path} is not in the bucket (HTTP ${res.status})`);
  const type = res.headers.get("content-type") ?? "";
  return {
    name: path,
    data: Buffer.from(await res.arrayBuffer()),
    mediaType: type.includes("png") || path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
  };
}

export interface RunReport {
  dry: boolean;
  read: number;
  stored: number;
  /** Posts the robot itself reported a problem on; stored as rows with the problem in `notes`. */
  problems: number;
  /** Posts not reached inside the time budget; send them again. */
  unread: number;
  aiCalls: number;
  costUsd: number;
  posts: {
    platform: Platform;
    account: string;
    caption: string | null;
    matched: string | null;
    reading: number | null;
    screens: number;
    problem: string | null;
  }[];
}

/** Stop starting new posts after this long, inside the route's 300 s. */
const RUN_TIME_BUDGET_MS = 240_000;

/**
 * Reads every post in the request and stores a row each. A post the robot
 * could not open becomes a row with its problem in `notes` and no numbers, so
 * the failure is on record where the numbers would have been. `dry` matches
 * and fetches but neither asks the AI nor writes.
 */
export async function runReadings(req: RunRequest, opts: { dry?: boolean; model?: string } = {}): Promise<RunReport> {
  const dry = opts.dry ?? false;
  const started = Date.now();
  const report: RunReport = { dry, read: 0, stored: 0, problems: 0, unread: 0, aiCalls: 0, costUsd: 0, posts: [] };
  const pools = new Map<string, PostCandidate[]>();

  for (const post of req.posts) {
    if (Date.now() - started > RUN_TIME_BUDGET_MS) {
      report.unread += 1;
      report.posts.push({ platform: post.platform, account: post.account, caption: post.caption ?? null, matched: null, reading: null, screens: post.screenshots.length, problem: "not read: out of time, send again" });
      continue;
    }
    const entry: RunReport["posts"][number] = { platform: post.platform, account: post.account, caption: post.caption ?? null, matched: post.post_url ?? null, reading: null, screens: post.screenshots.length, problem: post.problem ?? null };
    report.posts.push(entry);
    try {
      // Which stored post this is.
      let match: PostCandidate | null = null;
      if (!post.post_url) {
        const poolKey = `${post.platform}:${post.account}`;
        if (!pools.has(poolKey)) pools.set(poolKey, await recentPosts(post.platform, post.account));
        match = pickPost(pools.get(poolKey) ?? [], post.caption, post.posted_at_text);
        entry.matched = match?.post_url ?? null;
      }
      const group: Omit<ScreenGroup, "screenshots"> = {
        platform: post.platform,
        account: post.account,
        postUrl: post.post_url ?? match?.post_url ?? null,
        postId: match?.post_id ?? null,
        format: match?.format ?? null,
        postedAt: match?.posted_at ?? null,
        captionSnippet: post.caption ?? match?.caption_snippet ?? null,
        readBy: req.read_by,
      };

      let row: ReadingRow;
      if (post.problem) {
        // The robot could not open the analytics: record that, with no numbers.
        report.problems += 1;
        row = toRow(null, group, post.screenshots);
        row.notes = post.problem;
      } else {
        const screenshots = await Promise.all(post.screenshots.map(downloadScreen));
        if (dry) {
          if (!match && !post.post_url) entry.problem = "no matching post in the performance table";
          continue;
        }
        const result = await readScreens({ ...group, screenshots }, { model: opts.model, screenshotPaths: post.screenshots });
        report.aiCalls += 1;
        report.costUsd = Math.round((report.costUsd + (result.costUsd ?? 0)) * 1e6) / 1e6;
        report.read += 1;
        row = result.row;
        if (result.problem) entry.problem = result.problem;
        if (!group.postUrl) row.notes = [row.notes, "no matching post in the performance table"].filter(Boolean).join(" ");
      }
      if (!dry) {
        entry.reading = await insertReading(row);
        report.stored += 1;
      }
    } catch (err) {
      if (err instanceof AiUnavailable) throw err;
      entry.problem = err instanceof Error ? err.message : String(err);
    }
  }
  return report;
}
