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

import { createHash } from "node:crypto";

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
    crossposted_to_facebook: nullable("boolean"),
    notes: nullable("string"),
  },
  required: [
    "screens_seen", "format", "posted_at_text",
    "views", "views_instagram", "views_facebook", "viewers",
    "likes", "comments", "shares", "saves", "reposts", "new_followers", "profile_visits",
    "avg_watch_s", "total_watch_s", "watched_full_pct", "retention_avg_pct", "drop_off_s", "skip_rate_pct",
    "retention_curve", "followers_pct", "new_viewers_pct",
    "traffic_sources", "audience_age", "audience_country", "audience_gender", "rate_signals",
    "fyp_restricted", "crossposted_to_facebook", "notes",
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
- views_instagram, views_facebook, skip_rate_pct, rate_signals, reposts, profile_visits are never on TikTok: null.
- crossposted_to_facebook is never on TikTok: null.`,
  instagram: `These are Instagram "Post insights" or "Reel insights" screens: tabs Overview, Engagement, Audience.
- The row of icons under the thumbnail is likes, comments, reposts, shares, saves.
- Overview "Summary": Views (views), Viewers (viewers), Profile visits (profile_visits), Follows (new_followers), Average watch time (avg_watch_s; Reels only). crossposted_to_facebook: true when "Crossposted to Facebook" is written under Summary, false when the Summary is among the screens without it, null when it is not among the screens. When crossposted, the Summary's Views and the row of icons count Instagram and Facebook together: copy them as shown. Only if a list on the screens gives the Instagram and Facebook views separately, those go to views_instagram and views_facebook; otherwise both are null (the "Views over time" graph is Instagram only and gives no number).
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
- avg_watch_s, total_watch_s, watched_full_pct, retention_avg_pct, drop_off_s, skip_rate_pct, rate_signals, reposts, profile_visits, new_viewers_pct, fyp_restricted, crossposted_to_facebook are never on Facebook: null.`,
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

/**
 * One post's screenshots as a fingerprint, so the same hand-off sent twice
 * stores one row (fourth sitting, 2026-10-27: the robot gave up waiting after
 * 10 s and sent its 12 Instagram posts four times, 48 rows). The paths carry
 * the account, the day and the order, so two different readings never share
 * one. Null when there are no screenshots: nothing to tell sends apart by.
 */
export function screensKey(platform: Platform, account: string, screenshots: string[]): string | null {
  if (screenshots.length === 0) return null;
  return createHash("sha256").update([platform, account, ...screenshots].join("\n")).digest("hex");
}

/**
 * The same for a post the robot could not open, which has no screenshots: its
 * place in the hand-off, what the robot said went wrong, and the day it was
 * sent. A hand-off sent again (the robot retries an error answer: fifth short
 * test, 2026-11-03, the AI out of credit after the problem post was stored)
 * is the same posts in the same order, so it finds the row already there
 * (readings 110 to 113 were one TikTok problem stored four times). Two
 * problem posts in one hand-off sit at different places, so both are kept;
 * the same problem at the same place in another sitting on the same day
 * counts as already stored, which loses nothing (a problem row has no
 * numbers).
 */
export function problemKey(post: Pick<RunPost, "platform" | "account" | "problem" | "caption" | "posted_at_text">, place: number, sentAt: Date): string | null {
  if (!post.problem) return null;
  const day = sentAt.toISOString().slice(0, 10);
  return createHash("sha256")
    .update(["problem", post.platform, post.account, day, String(place), post.problem, post.caption ?? "", post.posted_at_text ?? ""].join("\n"))
    .digest("hex");
}

/** The id of the reading already stored for these screenshots, or null. */
export async function readingByScreens(screens: string): Promise<number | null> {
  const key = serviceKey();
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/post_screen_readings?select=id&screens_key=eq.${screens}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`supabase HTTP ${res.status} looking up the reading`);
  const [found] = (await res.json()) as { id: number }[];
  return found?.id ?? null;
}

/**
 * Inserts the reading and returns its id. With `screens`, a reading already
 * stored under the same fingerprint wins and its id comes back instead: two
 * sends of one hand-off can be read side by side, and the table's unique
 * index lets only one in.
 */
export async function insertReading(row: ReadingRow, screens: string | null = null): Promise<number> {
  const key = serviceKey();
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/post_screen_readings?select=id`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(screens ? { ...row, screens_key: screens } : row),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 409 && screens) {
    const existing = await readingByScreens(screens);
    if (existing !== null) return existing;
  }
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
  /** The content piece; an Instagram post and its Facebook twin share it. */
  carousel_id?: string | null;
}

/**
 * Which stored post the robot read. Caption first (either side may be cut
 * short, so a prefix match either way counts); among several, the one posted
 * nearest the date on the screen, else the newest. With no caption, or none
 * that matches, the time on the screen alone (pickPostByTime): TikTok's
 * "Video analysis" prints no caption (first sitting, 2026-10-23). Null when
 * nothing matches.
 */
export function pickPost(candidates: PostCandidate[], caption: string | null | undefined, postedAtText?: string | null, zoneHours?: number | null): PostCandidate | null {
  const key = captionKey(caption);
  if (!key) return pickPostByTime(candidates, postedAtText, Date.now(), zoneHours);
  // A short caption has to match whole: "The" must not pick the newest post
  // that starts with "the".
  const hits = candidates.filter((c) => {
    const ck = captionKey(c.caption_snippet);
    if (!ck) return false;
    if (key.length < 8 || ck.length < 8) return ck === key;
    return ck.startsWith(key) || key.startsWith(ck);
  });
  if (hits.length === 0) return pickPostByTime(candidates, postedAtText, Date.now(), zoneHours);
  const screen = postedAtText ? Date.parse(postedAtText.replace(/^(posted|published)(\s+on)?\s+/i, "")) : NaN;
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

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * The date and time an analytics screen prints ("Posted on Oct 16, 2026,
 * 11:43 AM"), as that clock reading written as if it were UTC. The phone's
 * own time zone is not known here. Null without a minute. Facebook's "Post
 * details" prints no year ("Oct 29, 10:00 AM", second short test,
 * 2026-10-29): given `now`, that is this year, or last year if this year's
 * would be more than two days ahead; without `now`, null.
 */
export function screenClock(text: string | null | undefined, now?: number): number | null {
  const m = /([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(?:(\d{4}),?\s+)?(?:at\s+)?(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?/i.exec(text ?? "");
  if (!m) return null;
  if (!m[3] && now === undefined) return null;
  const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
  let hour = Number(m[4]);
  const minute = Number(m[5]);
  const half = m[6]?.replace(/\./g, "").toLowerCase();
  if (month < 0 || minute > 59) return null;
  if (half) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (half === "pm" ? 12 : 0);
  } else if (hour > 23) return null;
  if (m[3]) return Date.UTC(Number(m[3]), month, Number(m[2]), hour, minute);
  const year = new Date(now!).getUTCFullYear();
  const shown = Date.UTC(year, month, Number(m[2]), hour, minute);
  return shown > now! + 2 * 86_400_000 ? Date.UTC(year - 1, month, Number(m[2]), hour, minute) : shown;
}

/** How far a phone's clock can be from UTC: the time zones run from 12 hours behind to 14 ahead. */
const MAX_ZONE_MS = 14 * 3_600_000;

/**
 * A post by the time on the screen alone, for a screen that prints no
 * caption. The phone shows the posting time in its own time zone, to the
 * minute: a post matches when it was posted in that minute in a whole-hour
 * time zone (phone 1 shows Phoenix time: 11:43 AM for a post stored at
 * 18:43:40 UTC). Only a single such post counts; two is a guess, and gives
 * nothing.
 */
export function pickPostByTime(candidates: PostCandidate[], postedAtText: string | null | undefined, now = Date.now(), zoneHours?: number | null): PostCandidate | null {
  const shown = screenClock(postedAtText, now);
  if (shown === null) return null;
  const hits = candidates.filter((c) => {
    const at = Date.parse(c.posted_at);
    if (Number.isNaN(at)) return false;
    const offset = at - shown; // the zone's hours, plus the seconds the screen leaves off
    if (zoneHours !== undefined && zoneHours !== null) return offset - zoneHours * HOUR_MS >= 0 && offset - zoneHours * HOUR_MS < 60_000;
    if (Math.abs(offset) > MAX_ZONE_MS + 60_000) return false;
    return ((offset % HOUR_MS) + HOUR_MS) % HOUR_MS < 60_000;
  });
  return hits.length === 1 ? hits[0] : null;
}

const HOUR_MS = 3_600_000;

/**
 * The phone's time zone, as the hours to add to the time it shows to get
 * UTC (phone 1, Phoenix: 7), worked out from all the times one account's
 * posts showed in one hand-off: the zone under which the most of them match
 * exactly one stored post. Facebook schedules posts on the hour (10:00 AM,
 * 6:00 AM), so one time alone fits a post in every zone (second short test,
 * 2026-10-29). Null when no zone matches more than one post, or two zones
 * tie: then each time is matched alone, as before.
 */
export function phoneZoneHours(candidates: PostCandidate[], postedAtTexts: (string | null | undefined)[], now = Date.now()): number | null {
  const texts = postedAtTexts.filter((t) => screenClock(t, now) !== null);
  let best: number | null = null;
  let bestCount = 1;
  let tie = false;
  for (let zone = -14; zone <= 12; zone++) {
    const count = texts.filter((t) => pickPostByTime(candidates, t, now, zone) !== null).length;
    if (count > bestCount) [best, bestCount, tie] = [zone, count, false];
    else if (count === bestCount && best !== null) tie = true;
  }
  return tie ? null : best;
}

/**
 * The key `fb_post_performance` files a Facebook account under: its number
 * (accounts.username, "61588896089516"), while the robot knows it by the
 * name on its profile ("Imani Vaughn", accounts.display_name). The name
 * itself when no single account has it (the robot may already send the number).
 */
async function facebookAccountKey(account: string): Promise<string> {
  const key = serviceKey();
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/accounts?select=username&platform=eq.facebook&display_name=eq.${encodeURIComponent(account)}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`supabase HTTP ${res.status} reading accounts`);
  const rows = (await res.json()) as { username: string | null }[];
  return rows.length === 1 && rows[0].username ? rows[0].username : account;
}

/** The account's posts from the last 45 days, newest first: the pool a reading is matched against. */
export async function recentPosts(platform: Platform, name: string): Promise<PostCandidate[]> {
  const key = serviceKey();
  const table = { tiktok: "tt_post_performance", instagram: "post_performance", facebook: "fb_post_performance" }[platform];
  const account = platform === "facebook" ? await facebookAccountKey(name) : name;
  const since = new Date(Date.now() - 45 * 86_400_000).toISOString();
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/${table}?select=post_id,post_url,posted_at,caption_snippet,format,carousel_id` +
      `&account=eq.${encodeURIComponent(account)}&posted_at=gte.${encodeURIComponent(since)}&order=posted_at.desc&limit=200`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`supabase HTTP ${res.status} reading ${table}`);
  return (await res.json()) as PostCandidate[];
}

/** What a Facebook twin post's own table says, for splitting a crosspost. */
export interface TwinNumbers {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
}

/**
 * Instagram's insights for a reel crossposted to Facebook count both apps
 * together: Views and the row of icons (fourth short test, 2026-11-02:
 * 583 = 215 Instagram + 368 Facebook, and 6 likes = 3 + 3). Viewers is
 * Instagram's alone. The row keeps Instagram's part, the same thing every
 * other Instagram number on the dashboard means; the Facebook views go to
 * views_facebook, which the All posts tab shows as "N views on Facebook".
 * The Facebook part is the twin's own count, taken when the screen was read,
 * so Instagram's part can be a few views off (and is empty if Facebook's
 * count has already passed the screen's total). With no twin numbers the
 * combined counts are cleared rather than stored as Instagram's (empty is
 * not 0, and not a wrong number either); `raw` keeps what the screen said.
 */
export function splitCrosspost(row: ReadingRow, twin: TwinNumbers | null): ReadingRow {
  const raw = isDict(row.raw) ? row.raw : {};
  if (row.platform !== "instagram" || raw.crossposted_to_facebook !== true) return row;
  const out = { ...row };
  const fbViews = row.views_facebook ?? twin?.views ?? null;
  // A 0 on the screen is 0 for each app; otherwise Facebook's own count is needed.
  const part = (total: number | null, fb: number | null | undefined) =>
    total === 0 ? 0 : total === null || fb === null || fb === undefined || fb > total ? null : total - fb;
  const igViews = row.views_instagram ?? part(row.views, fbViews);
  out.views = igViews;
  out.views_instagram = igViews;
  out.views_facebook = fbViews;
  out.likes = part(row.likes, twin?.likes);
  out.comments = part(row.comments, twin?.comments);
  out.shares = part(row.shares, twin?.shares);
  out.saves = part(row.saves, twin?.saves);
  const said = [`${row.views ?? "?"} views`, `${row.likes ?? "?"} likes`].join(" and ");
  const note = twin
    ? `Crossposted to Facebook: the screen's ${said} include the Facebook post's; stored is Instagram's part (Facebook's from its own numbers).`
    : `Crossposted to Facebook: the screen's ${said} include Facebook's, and the Facebook post was not found, so they are not stored.`;
  out.notes = [row.notes, note].filter(Boolean).join(" ");
  return out;
}

/**
 * The Facebook twin of an Instagram post: the post with the same content
 * piece on the Facebook account that mirrors this Instagram account
 * (accounts.mirrors_account_id). Null when there is none.
 */
export async function facebookTwin(igHandle: string, contentId: string | null | undefined): Promise<TwinNumbers | null> {
  if (!contentId) return null;
  const key = serviceKey();
  const get = async <T>(path: string): Promise<T[]> => {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`supabase HTTP ${res.status} reading ${path.split("?")[0]}`);
    return (await res.json()) as T[];
  };
  const [ig] = await get<{ id: string }>(`accounts?select=id&platform=eq.instagram&username=eq.${encodeURIComponent(igHandle)}`);
  if (!ig) return null;
  const [fb] = await get<{ username: string | null }>(`accounts?select=username&platform=eq.facebook&mirrors_account_id=eq.${encodeURIComponent(String(ig.id))}`);
  if (!fb?.username) return null;
  const rows = await get<TwinNumbers>(
    `fb_post_performance?select=views,likes,comments,shares,saves&account=eq.${encodeURIComponent(fb.username)}&carousel_id=eq.${encodeURIComponent(contentId)}&limit=2`,
  );
  return rows.length === 1 ? rows[0] : null;
}

/**
 * Buttons the robot has taken for a caption: Facebook's "Post details" has
 * no caption of its own, and the first line of text under the post is a
 * button (fourth short test, 2026-11-02: "Open get more bottomsheet menu";
 * second, 2026-10-29: "See post"; sixth, 2026-11-03: "Compare post
 * insights"). A Facebook post's caption is its Instagram twin's, which the
 * matched post carries.
 */
const NOT_A_CAPTION = /^(open get more bottomsheet menu|see post|see more|more|compare post insights)$/i;
export function captionOrNull(caption: string | null | undefined): string | null {
  const c = caption?.trim();
  return c && !NOT_A_CAPTION.test(c) ? c : null;
}

// ---------------------------------------------------------------------------
// One-time upload links (the robot's way into the bucket)
// ---------------------------------------------------------------------------

/**
 * A screenshot's path in the bucket, as the robot names it:
 * <platform>/<account>/<yyyy-mm-dd>/<nn>-<name>.jpeg. Nothing else is signed,
 * so a link can never point outside a post's own folder.
 */
export const SCREEN_PATH_RE = /^(tiktok|instagram|facebook)\/[A-Za-z0-9._-]{1,80}\/\d{4}-\d{2}-\d{2}\/\d{2,3}-[A-Za-z0-9._-]{1,120}\.(jpeg|jpg|png)$/;
export const SCREEN_LINK_LIMIT = 200;
const SCREEN_TYPES: Record<string, true> = { "image/jpeg": true, "image/png": true };

export interface ScreenLinkRequest {
  path: string;
  type: "image/jpeg" | "image/png";
}

/** `{ screens: [{ path, type? }] }`, checked; throws with a plain message when it is not that. */
export function parseScreenLinks(body: unknown): ScreenLinkRequest[] {
  if (!isDict(body) || !Array.isArray(body.screens) || body.screens.length === 0) throw new Error("screens must be a list with at least one screenshot");
  if (body.screens.length > SCREEN_LINK_LIMIT) throw new Error(`Ask for at most ${SCREEN_LINK_LIMIT} links in one call`);
  const seen = new Set<string>();
  return body.screens.map((s, i): ScreenLinkRequest => {
    const o = isDict(s) ? s : {};
    const path = typeof o.path === "string" ? o.path.trim() : "";
    if (!SCREEN_PATH_RE.test(path)) throw new Error(`screens[${i}].path must look like tiktok/account/2026-10-24/01-overview.jpeg`);
    if (seen.has(path)) throw new Error(`screens[${i}].path is listed twice`);
    seen.add(path);
    const type = o.type === undefined ? "image/jpeg" : o.type;
    if (typeof type !== "string" || !SCREEN_TYPES[type]) throw new Error(`screens[${i}].type must be image/jpeg or image/png`);
    return { path, type: type as ScreenLinkRequest["type"] };
  });
}

/**
 * A one-time link the Air can PUT one screenshot to, straight into the
 * private bucket. The Air never holds a project key: this is the same door
 * the session recorder uses for its frames. A path sent twice (a retry)
 * overwrites itself.
 */
export async function signScreenUpload(path: string): Promise<string> {
  const key = serviceKey();
  const base = `${process.env.SUPABASE_URL}/storage/v1`;
  const safe = path.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${base}/object/upload/sign/${BUCKET}/${safe}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "x-upsert": "true" },
    body: "{}",
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`sign screen upload: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("sign screen upload: no link returned");
  return `${base}${json.url}`;
}

/** Links for a batch, a few at a time so two hundred come back in seconds. */
export async function signScreenBatch(screens: ScreenLinkRequest[]): Promise<{ path: string; url: string }[]> {
  const out: { path: string; url: string }[] = [];
  const group = 25;
  for (let i = 0; i < screens.length; i += group) {
    const slice = screens.slice(i, i + group);
    out.push(...(await Promise.all(slice.map((s) => signScreenUpload(s.path).then((url) => ({ path: s.path, url }))))));
  }
  return out;
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
  /** Posts an earlier send of the same hand-off had already stored; not read or stored again. */
  already: number;
  /** Posts that went wrong inside the dashboard (the database or the AI did
   *  not answer, a screenshot is missing): nothing stored, the reason in the
   *  post's `problem`. Sending the hand-off again is safe and reads only these. */
  failed: number;
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
const NO_MATCH_NOTE = "no matching post in the performance table";

/**
 * Reads every post in the request and stores a row each. A post the robot
 * could not open becomes a row with its problem in `notes` and no numbers, so
 * the failure is on record where the numbers would have been. `dry` matches
 * and fetches but neither asks the AI nor writes.
 */
export async function runReadings(req: RunRequest, opts: { dry?: boolean; model?: string } = {}): Promise<RunReport> {
  const dry = opts.dry ?? false;
  const started = Date.now();
  const report: RunReport = { dry, read: 0, stored: 0, problems: 0, unread: 0, already: 0, failed: 0, aiCalls: 0, costUsd: 0, posts: [] };
  const pools = new Map<string, PostCandidate[]>();
  const zones = new Map<string, number | null>();
  const keys = new Map<string, string>();

  const sentAt = new Date();
  for (const [place, post] of req.posts.entries()) {
    if (Date.now() - started > RUN_TIME_BUDGET_MS) {
      report.unread += 1;
      report.posts.push({ platform: post.platform, account: post.account, caption: post.caption ?? null, matched: null, reading: null, screens: post.screenshots.length, problem: "not read: out of time, send again" });
      continue;
    }
    const caption = captionOrNull(post.caption);
    const entry: RunReport["posts"][number] = { platform: post.platform, account: post.account, caption, matched: post.post_url ?? null, reading: null, screens: post.screenshots.length, problem: post.problem ?? null };
    report.posts.push(entry);
    try {
      // Sent before (the robot tries again when an answer is slow): point at
      // that row and spend no AI call on it.
      const screens = screensKey(post.platform, post.account, post.screenshots) ?? (post.problem && post.screenshots.length === 0 ? problemKey(post, place, sentAt) : null);
      const earlier = !dry && screens ? await readingByScreens(screens) : null;
      if (earlier !== null) {
        entry.reading = earlier;
        report.already += 1;
        continue;
      }

      // Which stored post this is.
      let match: PostCandidate | null = null;
      if (!post.post_url) {
        const poolKey = `${post.platform}:${post.account}`;
        if (!pools.has(poolKey)) {
          const pool = await recentPosts(post.platform, post.account);
          pools.set(poolKey, pool);
          const shown = req.posts.filter((p) => p.platform === post.platform && p.account === post.account).map((p) => p.posted_at_text);
          zones.set(poolKey, phoneZoneHours(pool, shown));
        }
        match = pickPost(pools.get(poolKey) ?? [], caption, post.posted_at_text, zones.get(poolKey));
        entry.matched = match?.post_url ?? null;
      }
      // A Facebook reading is filed under the page's number, as its posts
      // are, not the name the robot sees on the profile (sixth short test:
      // the account page looks readings up by the number and found none).
      if (post.platform === "facebook" && !keys.has(post.account)) keys.set(post.account, await facebookAccountKey(post.account));
      const group: Omit<ScreenGroup, "screenshots"> = {
        platform: post.platform,
        account: keys.get(post.account) ?? post.account,
        postUrl: post.post_url ?? match?.post_url ?? null,
        postId: match?.post_id ?? null,
        format: match?.format ?? null,
        postedAt: match?.posted_at ?? null,
        captionSnippet: caption ?? match?.caption_snippet ?? null,
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
        if (post.platform === "instagram") row = splitCrosspost(row, await facebookTwin(post.account, match?.carousel_id));
        if (result.problem) entry.problem = result.problem;
        if (!group.postUrl) row.notes = [row.notes, NO_MATCH_NOTE].filter(Boolean).join(" ");
      }
      if (!dry) {
        entry.reading = await insertReading(row, screens);
        report.stored += 1;
      }
    } catch (err) {
      if (err instanceof AiUnavailable) throw err;
      report.failed += 1;
      entry.problem = err instanceof Error ? err.message : String(err);
    }
  }
  return report;
}

/**
 * Why a hand-off has to be sent again, or null when every post was dealt with.
 * The robot only logs the report's counts, so a post that failed here (the
 * database timed out on 2026-11-02) looked like "0 read, 0 stored, 0 with a
 * problem". Its route answers with an error instead, which the robot retries
 * and, failing that, logs word for word.
 */
export function failedSummary(report: Pick<RunReport, "failed" | "posts">): string | null {
  if (report.failed === 0) return null;
  const sent = report.posts.length;
  const first = report.posts.find((post) => post.reading === null && post.problem)?.problem ?? "no reason given";
  return `${report.failed} of ${sent} post(s) could not be read or stored; send the hand-off again (posts already stored are not read twice). First problem: ${first}`;
}

// ---------------------------------------------------------------------------
// Re-linking: readings taken before their post was fetched
// ---------------------------------------------------------------------------

/** A stored reading, as much of it as re-linking needs. */
export interface StoredReading {
  id: number;
  platform: Platform;
  account: string;
  post_id: string | null;
  post_url: string | null;
  posted_at: string | null;
  format: string | null;
  caption_snippet: string | null;
  views: number | null;
  notes: string | null;
  raw: unknown;
}

export type RelinkPatch = Partial<Pick<ReadingRow,
  "account" | "post_id" | "post_url" | "posted_at" | "format" | "caption_snippet" |
  "views" | "views_instagram" | "views_facebook" | "likes" | "comments" | "shares" | "saves" | "notes">>;

/** The robot's "no matching post" remark, taken out of a reading's notes. */
function withoutNoMatch(notes: string | null): string | null {
  const left = (notes ?? "").replace(NO_MATCH_NOTE, "").replace(/\s{2,}/g, " ").trim();
  return left || null;
}

/**
 * What changes on one stored reading now that more is known (pure). The
 * robot reads posts within hours of posting, before the platforms' own
 * fetches have them (sixth short test, 2026-11-03: 4 of 6 readings matched
 * nothing), and a reading that matched nothing stayed that way. Here:
 * - `match`, when the reading had no post, links it;
 * - an Instagram reel crossposted to Facebook whose numbers were left empty
 *   (no Facebook twin then) is split again from what the screen said (`raw`)
 *   once `twin` is known, as splitCrosspost does on the day;
 * - a Facebook reading takes the page's number for its account (`accountKey`);
 * - a button taken for a caption is cleared, or replaced by the post's.
 * Null when nothing changes.
 */
export function relinkPatch(r: StoredReading, accountKey: string, match: PostCandidate | null, twin: TwinNumbers | null): RelinkPatch | null {
  const patch: RelinkPatch = {};
  if (accountKey !== r.account) patch.account = accountKey;
  let caption = captionOrNull(r.caption_snippet);
  if (!r.post_id && match) {
    patch.post_id = match.post_id;
    patch.post_url = match.post_url;
    patch.posted_at = match.posted_at;
    if (!r.format && match.format) patch.format = match.format;
    caption = caption ?? captionOrNull(match.caption_snippet);
    patch.notes = withoutNoMatch(r.notes);
  }
  if (caption !== r.caption_snippet) patch.caption_snippet = caption;
  const raw = isDict(r.raw) ? r.raw : null;
  if (r.platform === "instagram" && raw?.crossposted_to_facebook === true && r.views === null && twin) {
    const said = toRow(raw, { platform: r.platform, account: r.account }, []);
    const split = splitCrosspost(said, twin);
    if (split.views !== null) {
      Object.assign(patch, {
        views: split.views, views_instagram: split.views_instagram, views_facebook: split.views_facebook,
        likes: split.likes, comments: split.comments, shares: split.shares, saves: split.saves,
        notes: split.notes,
      });
    }
  }
  if (patch.notes === r.notes) delete patch.notes;
  return Object.keys(patch).length ? patch : null;
}

export interface RelinkReport {
  dry: boolean;
  checked: number;
  changed: number;
  linked: number;
  split: number;
  rows: { id: number; platform: Platform; account: string; matched: string | null; patch: RelinkPatch }[];
}

/** Readings this far back are looked at again; the pool of posts goes back 45 days too. */
const RELINK_DAYS = 45;

/**
 * Looks at every reading of the last 45 days again (relinkPatch) and writes
 * what changed. Run daily after the platforms' fetches (vercel.json); `dry`
 * only reports. Problem rows (nothing read) are left alone.
 */
export async function relinkReadings(opts: { dry?: boolean } = {}): Promise<RelinkReport> {
  const dry = opts.dry ?? false;
  const key = serviceKey();
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const since = new Date(Date.now() - RELINK_DAYS * 86_400_000).toISOString();
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/post_screen_readings?select=id,platform,account,post_id,post_url,posted_at,format,caption_snippet,views,notes,raw` +
      `&raw=not.is.null&read_at=gte.${encodeURIComponent(since)}&order=id`,
    { headers, signal: AbortSignal.timeout(20_000) },
  );
  if (!res.ok) throw new Error(`supabase HTTP ${res.status} reading post_screen_readings`);
  const readings = (await res.json()) as StoredReading[];
  const report: RelinkReport = { dry, checked: readings.length, changed: 0, linked: 0, split: 0, rows: [] };

  const groups = new Map<string, StoredReading[]>();
  for (const r of readings) {
    const k = `${r.platform}\u0000${r.account}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const rows of groups.values()) {
    const { platform, account } = rows[0];
    const accountKey = platform === "facebook" ? await facebookAccountKey(account) : account;
    const pool = await recentPosts(platform, accountKey);
    const texts = rows.map((r) => (isDict(r.raw) && typeof r.raw.posted_at_text === "string" ? r.raw.posted_at_text : null));
    const zone = phoneZoneHours(pool, texts);
    for (const [i, r] of rows.entries()) {
      const match = r.post_id
        ? (pool.find((p) => p.post_id === r.post_id) ?? null)
        : pickPost(pool, captionOrNull(r.caption_snippet), texts[i], zone);
      const needsTwin = platform === "instagram" && r.views === null && isDict(r.raw) && r.raw.crossposted_to_facebook === true;
      const twin = needsTwin ? await facebookTwin(account, match?.carousel_id) : null;
      const patch = relinkPatch(r, accountKey, r.post_id ? null : match, twin);
      if (!patch) continue;
      report.changed += 1;
      if (patch.post_id) report.linked += 1;
      if (patch.views !== undefined) report.split += 1;
      report.rows.push({ id: r.id, platform, account: accountKey, matched: patch.post_url ?? null, patch });
      if (dry) continue;
      const put = await fetch(`${process.env.SUPABASE_URL}/rest/v1/post_screen_readings?id=eq.${r.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(patch),
        signal: AbortSignal.timeout(10_000),
      });
      if (!put.ok) throw new Error(`supabase HTTP ${put.status} updating reading ${r.id}: ${(await put.text().catch(() => "")).slice(0, 200)}`);
    }
  }
  return report;
}
