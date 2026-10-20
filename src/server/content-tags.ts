/**
 * DA-03: tag every posted piece of content with what is in it, so the
 * dashboard can compare like with like inside one account (do question hooks
 * hold better than statement hooks here?). docs/DEEP-ANALYTICS-TICKETS.md.
 *
 * Most tags were written down when the content was made, in the lane's own
 * table: the hook words, and for five lanes a hook type. Those are copied, not
 * guessed (decision 2026-10-20: each lane keeps the hook types it was written
 * with). The AI looks at one picture per piece, the first slide or the frame
 * half a second into the video, and fills only what no table holds:
 *   - whether a face shows (every piece; carousels and videos, 2026-10-20);
 *   - the words on screen, for lanes that store no hook text;
 *   - a hook type from a short fixed list, for lanes that record none.
 * Slide count comes from the stored slides, video length from the file.
 *
 * Never asked: why a post did well. On a single post the AI tells a confident
 * story about what was mostly luck (research, 2026-10-09).
 *
 * Runs once a day (vercel.json) on whatever has posted and has no tags yet,
 * newest first. A piece is tagged once; its row says which fields the AI filled.
 */
import { execFile } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const MODEL = process.env.CONTENT_TAGS_MODEL || "anthropic/claude-haiku-5.5";
/** Pieces tagged per run unless the request asks for another number. */
export const DEFAULT_LIMIT = 40;
/** Pieces worked on at once. Small: each is a download and one AI call. */
const AT_ONCE = 4;
/** Stop starting new pieces after this long, inside the route's 300s. */
const TIME_BUDGET_MS = 240_000;

/**
 * Hook types the AI picks from, for lanes whose writers recorded none. Lanes
 * that did record one keep theirs: a comparison is within one account, and an
 * account posts one character's lanes, so lanes need not share a list.
 */
export const AI_HOOK_TYPES = {
  question: "asks the viewer something",
  surprising_fact: "a claim or fact meant to stop the scroll",
  personal_story: "a first-person moment or confession",
  progress: "a before and after, a day count, a change over time",
  talking_to: "speaks directly to someone or something",
  curiosity_gap: "holds back the answer so you keep watching",
  other: "none of these",
} as const;
export type AiHookType = keyof typeof AI_HOOK_TYPES;

// ---------------------------------------------------------------------------
// Pure parts (tested in content-tags.test.ts)
// ---------------------------------------------------------------------------

/**
 * Where each lane keeps its hook words, in order of preference. The lanes
 * grew separately, so the same thing has six names. `hook_before` is the
 * before-and-after lanes' first screen; `slide_1` is a carousel's first slide.
 */
const HOOK_TEXT_COLUMNS = ["hook_text", "text_hook", "hook_before", "hook", "screen_1_text", "source_hook_text", "slide_1"];
/** Where a lane's writer recorded the hook type, when it did. */
const HOOK_TYPE_COLUMNS = ["hook_type", "hook_angle"];

function firstText(row: Record<string, unknown> | null, columns: string[]): string | null {
  if (!row) return null;
  for (const c of columns) {
    const v = row[c];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function hookTextOf(row: Record<string, unknown> | null): string | null {
  return firstText(row, HOOK_TEXT_COLUMNS)?.slice(0, 500) ?? null;
}

/**
 * The writer's hook type, or null when it recorded none worth keeping:
 * "default" and a type named after the lane itself say nothing.
 */
export function hookTypeOf(row: Record<string, unknown> | null, contentType: string): string | null {
  const v = firstText(row, HOOK_TYPE_COLUMNS);
  if (!v || v === "default" || v === contentType) return null;
  return v.slice(0, 120);
}

/**
 * The part before the colon: 'talk_to_weight:fired' is 'talk_to_weight'.
 * Lower case, because Journey wrote both 'Declaration' and 'declaration:…'.
 */
export function hookFamilyOf(hookType: string | null): string | null {
  if (!hookType) return null;
  return hookType.split(":")[0].trim().toLowerCase() || null;
}

/** ffmpeg prints "Duration: 00:00:46.00"; that, in seconds. */
export function parseDuration(ffmpegLog: string): number | null {
  const m = ffmpegLog.match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!m) return null;
  const s = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  return Number.isFinite(s) && s > 0 ? Math.round(s * 100) / 100 : null;
}

const VIDEO_FILE = /\.(mp4|mov|m4v|webm)(\?|$)/i;

export function isVideo(mediaShape: string | null, url: string): boolean {
  if (mediaShape === "video") return true;
  if (mediaShape === "image_carousel") return false;
  return VIDEO_FILE.test(url);
}

/**
 * The picture the AI looks at: the first slide, or the video itself. Early
 * before-and-after videos were stored as Google Drive "view" links, which are
 * a web page; Drive's download link for the same file is the file.
 */
export function firstMedia(mediaUrl: string | null, mediaUrls: string[] | null): string | null {
  const first = (mediaUrls?.find((u) => typeof u === "string" && u.trim()) ?? mediaUrl)?.trim();
  if (!first) return null;
  const drive = first.match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/);
  return drive ? `https://drive.google.com/uc?export=download&id=${drive[1]}` : first;
}

export interface AiTags {
  face: boolean | null;
  wordsOnScreen: string | null;
  hookType: AiHookType | null;
}

/** The AI's reply is untrusted: only the expected fields, cut to length. */
export function readAiReply(reply: Record<string, unknown>): AiTags {
  const face = typeof reply.face === "boolean" ? reply.face : null;
  const words = typeof reply.words_on_screen === "string" ? reply.words_on_screen.trim().slice(0, 500) : "";
  const type = typeof reply.hook_type === "string" ? reply.hook_type.trim().toLowerCase() : "";
  return {
    face,
    wordsOnScreen: words || null,
    hookType: Object.hasOwn(AI_HOOK_TYPES, type) ? (type as AiHookType) : null,
  };
}

export function promptFor(knownHook: string | null, wantHookType: boolean): string {
  const lines = [
    "You label one picture from a social media post: the first slide of a carousel, or a frame from the start of a video.",
    'Answer with JSON: {"face": true or false, "words_on_screen": "...", "hook_type": "..."}.',
    "face: true when a person's or a character's face is clearly visible. Puppets, cartoons and illustrated characters count. A face hidden or turned fully away does not.",
    "words_on_screen: the overlaid caption or text, word for word, as one line. Empty string if there is none.",
  ];
  if (wantHookType) {
    const list = Object.entries(AI_HOOK_TYPES).map(([k, v]) => `  ${k}: ${v}`).join("\n");
    lines.push(
      `hook_type: the kind of opening line, one of:\n${list}`,
      knownHook ? `The opening line is: "${knownHook}". Judge that line.` : "Judge the words on screen.",
    );
  } else {
    lines.push('hook_type: leave it as "".');
  }
  return lines.join("\n");
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

interface Todo {
  content_type: string;
  content_id: string;
  media_url: string | null;
  media_urls: string[] | null;
}

interface Lane {
  content_type: string;
  source_table: string | null;
  source_id_column: string | null;
  media_shape: string | null;
  character: string | null;
}

async function todo(limit: number): Promise<Todo[]> {
  const res = await db("rpc/content_tags_todo", { method: "POST", body: JSON.stringify({ p_limit: limit }) });
  return (await res.json()) as Todo[];
}

async function lanes(): Promise<Map<string, Lane>> {
  const res = await db("content_type_registry?select=content_type,source_table,source_id_column,media_shape,character");
  return new Map(((await res.json()) as Lane[]).map((l) => [l.content_type, l]));
}

/** The row the content was made from, or null when the lane keeps none. */
async function sourceRow(lane: Lane | undefined, contentId: string): Promise<Record<string, unknown> | null> {
  if (!lane?.source_table || !lane.source_id_column) return null;
  const res = await db(
    `${encodeURIComponent(lane.source_table)}?${encodeURIComponent(lane.source_id_column)}=eq.${encodeURIComponent(contentId)}&select=*&limit=1`,
  );
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows[0] ?? null;
}

async function save(row: Record<string, unknown>): Promise<void> {
  await db("content_tags?on_conflict=content_type,content_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([row]),
  });
}

// ---------------------------------------------------------------------------
// The picture
// ---------------------------------------------------------------------------

/** Downscaled so the AI call stays small: about 1,000 tokens a picture. */
const PICTURE_WIDTH = 768;

async function slidePicture(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000), cache: "no-store" });
  if (!res.ok) throw new Error(`slide 1 could not be fetched (HTTP ${res.status})`);
  const raw = Buffer.from(await res.arrayBuffer());
  return sharp(raw).rotate().resize({ width: PICTURE_WIDTH, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}

/** The frame half a second in (past any fade from black), and the length. */
function videoPicture(url: string): Promise<{ picture: Buffer; seconds: number | null }> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("the video tool (ffmpeg) is missing on this server"));
    execFile(
      ffmpegPath,
      ["-hide_banner", "-ss", "0.5", "-i", url, "-frames:v", "1", "-vf", `scale=${PICTURE_WIDTH}:-2`, "-q:v", "4", "-f", "image2", "-c:v", "mjpeg", "pipe:1"],
      { encoding: "buffer", maxBuffer: 20 * 1024 * 1024, timeout: 60_000 },
      (err, stdout, stderr) => {
        const log = stderr.toString();
        if (err || !stdout.length) {
          const why = log.match(/(HTTP error \d+[^\n]*|Server returned[^\n]*|No such file[^\n]*)/)?.[1];
          return reject(new Error(`the video could not be read${why ? ` (${why.trim()})` : ""}`));
        }
        resolve({ picture: stdout, seconds: parseDuration(log) });
      },
    );
  });
}

// ---------------------------------------------------------------------------
// The AI
// ---------------------------------------------------------------------------

/** The AI service itself failed (out of credit, busy, down): stop the run. */
class AiUnavailable extends Error {}

async function askAboutPicture(picture: Buffer, prompt: string): Promise<Record<string, unknown>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiUnavailable("The AI is not connected: OPENROUTER_API_KEY is not set");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pm-dashboard-ashen.vercel.app",
      "X-Title": "PM Dashboard Content Tags",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `${prompt}\n\nReply with one JSON object and nothing else.` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${picture.toString("base64")}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (res.status === 401 || res.status === 402 || res.status === 429 || res.status >= 500) {
    throw new AiUnavailable(res.status === 402 ? "The AI account is out of credit" : `The AI could not be reached (HTTP ${res.status})`);
  }
  if (!res.ok) throw new Error(`the AI refused this picture (HTTP ${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "";
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("the AI's reply could not be read");
  try {
    return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new Error("the AI's reply could not be read");
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/** What one piece's row would be, before or after the AI. */
async function tagPiece(item: Todo, lane: Lane | undefined, dry: boolean): Promise<Record<string, unknown>> {
  const row: Record<string, unknown> = {
    content_type: item.content_type,
    content_id: item.content_id,
    character: lane?.character ?? null,
    media_shape: lane?.media_shape ?? null,
    hook_text: null,
    hook_text_source: null,
    hook_type: null,
    hook_family: null,
    hook_type_source: null,
    slide_count: null,
    video_seconds: null,
    face: null,
    problem: null,
    model: null,
    tagged_at: new Date().toISOString(),
  };
  const problems: string[] = [];

  let source: Record<string, unknown> | null = null;
  try {
    source = await sourceRow(lane, item.content_id);
  } catch (err) {
    problems.push(`the lane's own row could not be read (${err instanceof Error ? err.message : String(err)})`);
  }
  const writerHook = hookTextOf(source);
  const writerType = hookTypeOf(source, item.content_type);
  if (writerHook) Object.assign(row, { hook_text: writerHook, hook_text_source: "writer" });
  if (writerType) Object.assign(row, { hook_type: writerType, hook_family: hookFamilyOf(writerType), hook_type_source: "writer" });

  const media = firstMedia(item.media_url, item.media_urls);
  if (!media) {
    problems.push("no stored picture or video");
    row.problem = problems.join("; ");
    return row;
  }
  const video = isVideo(lane?.media_shape ?? null, media);
  if (!row.media_shape) row.media_shape = video ? "video" : "image_carousel";
  if (!video) row.slide_count = item.media_urls?.filter((u) => typeof u === "string" && u.trim()).length || 1;

  let picture: Buffer;
  try {
    if (video) {
      const v = await videoPicture(media);
      picture = v.picture;
      row.video_seconds = v.seconds;
    } else {
      picture = await slidePicture(media);
    }
  } catch (err) {
    problems.push(err instanceof Error ? err.message : String(err));
    row.problem = problems.join("; ");
    return row;
  }

  if (dry) {
    row.problem = [...problems, "dry run: the AI was not asked"].join("; ");
    return row;
  }

  try {
    const ai = readAiReply(await askAboutPicture(picture, promptFor(writerHook, !writerType)));
    row.model = MODEL;
    row.face = ai.face;
    if (ai.face === null) problems.push("the AI did not say whether there is a face");
    if (!writerHook && ai.wordsOnScreen) Object.assign(row, { hook_text: ai.wordsOnScreen, hook_text_source: "ai" });
    if (!writerType && ai.hookType && (writerHook || ai.wordsOnScreen)) {
      Object.assign(row, { hook_type: ai.hookType, hook_family: ai.hookType, hook_type_source: "ai" });
    }
  } catch (err) {
    if (err instanceof AiUnavailable) throw err;
    problems.push(err instanceof Error ? err.message : String(err));
  }
  row.problem = problems.length ? problems.join("; ") : null;
  return row;
}

export interface RunReport {
  startedAt: string;
  dry: boolean;
  asked: number;
  tagged: number;
  aiCalls: number;
  withProblems: { content_type: string; content_id: string; problem: string }[];
  /** Why the run stopped before the end of its list, if it did. */
  stopped: string | null;
  /** Dry runs only: the rows that would have been written. */
  rows?: Record<string, unknown>[];
}

/**
 * Tag up to `limit` pieces. A dry run reads everything and pulls every
 * picture but neither asks the AI nor writes, and returns the rows.
 */
export async function runContentTags(limit = DEFAULT_LIMIT, dry = false): Promise<RunReport> {
  const started = Date.now();
  const report: RunReport = { startedAt: new Date(started).toISOString(), dry, asked: 0, tagged: 0, aiCalls: 0, withProblems: [], stopped: null };
  if (dry) report.rows = [];
  const [items, laneMap] = await Promise.all([todo(limit), lanes()]);
  report.asked = items.length;

  let next = 0;
  const worker = async () => {
    while (next < items.length && !report.stopped) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        report.stopped ??= "time ran out; the rest are picked up next run";
        return;
      }
      const item = items[next++];
      try {
        const row = await tagPiece(item, laneMap.get(item.content_type), dry);
        if (row.model) report.aiCalls += 1;
        if (row.problem) report.withProblems.push({ content_type: item.content_type, content_id: item.content_id, problem: String(row.problem) });
        if (dry) report.rows!.push(row);
        else await save(row);
        report.tagged += 1;
      } catch (err) {
        if (err instanceof AiUnavailable) {
          report.stopped ??= err.message;
          return;
        }
        // A database failure on one piece: leave it untagged for the next run.
        report.withProblems.push({ content_type: item.content_type, content_id: item.content_id, problem: err instanceof Error ? err.message : String(err) });
      }
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));
  return report;
}
