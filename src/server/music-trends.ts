/**
 * Weekly music list refresh (Garreth, 2026-11-18). TokChart was too
 * expensive, so `music_library` keeps up with TikTok by itself:
 *
 * 1. LISTS. Read free trend lists: Metricool's weekly top 10 (with each
 *    song's TikTok sound id) and fan-kept "trending TikTok songs" Spotify
 *    playlists (`music_trend_settings.spotify_playlists`; Spotify's own charts
 *    cannot be read). New songs go on the watch list (`music_trend_watch`).
 *    Every library song is watched too.
 * 2. MEASURE. For each watched song due a check, find its TikTok sound (one
 *    ScrapeCreators search, once) and read how many videos use it (one
 *    credit). A week later the difference is its new videos a day.
 * 3. DECIDE. A song is trending when it gains at least `min_videos_per_day`
 *    (1,000) new videos a day; on its first check, being on Metricool's top 10
 *    this week counts (see isTrending).
 * 4. ADD. Trending songs not yet in the library are reviewed by the AI (fit
 *    for Character 6, mood tags) and added, marked trending. Library songs get
 *    their trending mark set or taken off. Nothing is ever removed or switched
 *    off (Garreth, 2026-11-18).
 *
 * Runs Tuesdays from vercel.json (Metricool updates Mondays). Stops starting
 * work at `credit_cap` credits or four minutes; the oldest checks go first, so
 * a cut-short run is finished by the next one. Each run is a row in
 * `music_trend_runs`. `dry` makes every lookup and AI call but writes nothing.
 */

import { sbFetch } from "@/lib/data/warmup-sessions";
import {
  REVIEW_PROMPT,
  cleanTitle,
  daysSince,
  firstArtist,
  isTrending,
  parseMetricool,
  parseReviews,
  parseSpotifyTracks,
  pickClip,
  songKey,
  songName,
  videosPerDay,
  type ListedSong,
  type Review,
  type SearchMusic,
  type TrendSource,
} from "@/server/music-trends-rules";

const SC = "https://api.scrapecreators.com";
const METRICOOL = "https://metricool.com/trending-tiktok-songs/";
const MODEL = process.env.MUSIC_TRENDS_MODEL || process.env.CONTENT_TAGS_MODEL || "anthropic/claude-haiku-5.5";
const BUDGET_MS = 240_000;
const PARALLEL = 6;
/** A song is measured at most once in this many days. */
const MEASURE_EVERY_DAYS = 6;
/** A song whose TikTok sound could not be found is searched again after this many days. */
const RESEARCH_DAYS = 28;
const SPOTIFY_MAX_PAGES = 6;

interface Settings {
  spotify_playlists: string[];
  use_metricool: boolean;
  min_videos_per_day: number;
  credit_cap: number;
  listed_window_days: number;
  library_recheck_days: number;
}

interface Watch {
  id: string;
  song_key: string;
  artist: string;
  title: string;
  sources: string[];
  first_listed: string | null;
  last_listed: string | null;
  tiktok_clip_id: string | null;
  tiktok_title: string | null;
  clip_searched_at: string | null;
  videos: number | null;
  checked_at: string | null;
  prev_videos: number | null;
  prev_checked_at: string | null;
  videos_per_day: number | null;
  status: "watching" | "in_library" | "rejected";
  reason: string | null;
  library_id: string | null;
}

interface LibrarySong {
  id: string;
  artist: string;
  title: string;
  is_trending: boolean;
}

export interface TrendReport {
  dry: boolean;
  metricoolWeek: string | null;
  listed: Record<TrendSource, number>;
  measured: number;
  noSoundFound: string[];
  added: { song: string; videosPerDay: number | null; known: boolean }[];
  rejected: { song: string; reason: string }[];
  nowTrending: string[];
  noLongerTrending: string[];
  credits: number;
  stoppedEarly: boolean;
  note: string | null;
}

class Run {
  credits = 0;
  readonly deadline = Date.now() + BUDGET_MS;
  constructor(readonly dry: boolean, readonly cap: number) {}
  get stop() {
    return Date.now() > this.deadline || this.credits >= this.cap;
  }
}

export class ScrapeCreatorsUnavailable extends Error {}
export class AiUnavailable extends Error {}

async function sc<T>(run: Run, path: string, params: Record<string, string>): Promise<T | null> {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key) throw new ScrapeCreatorsUnavailable("SCRAPECREATORS_API_KEY is not configured");
  run.credits += 1;
  const res = await fetch(`${SC}${path}?${new URLSearchParams(params)}`, {
    headers: { "x-api-key": key },
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return null;
  if (res.status === 401 || res.status === 402) {
    throw new ScrapeCreatorsUnavailable(res.status === 402 ? "ScrapeCreators is out of credit" : "ScrapeCreators refused the key");
  }
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as T | null;
}

async function db<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await sbFetch(path, init);
  if (!res.ok) throw new Error(`Supabase ${init.method ?? "GET"} ${path.split("?")[0]} answered HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

const JSON_HEADERS = { "Content-Type": "application/json", Prefer: "return=minimal" };
const RETURN_HEADERS = { "Content-Type": "application/json", Prefer: "return=representation" };

async function pool<T>(items: T[], run: Run, fn: (item: T) => Promise<void>): Promise<boolean> {
  let i = 0;
  let cut = false;
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (i < items.length) {
        if (run.stop) {
          cut = true;
          return;
        }
        await fn(items[i++]!);
      }
    }),
  );
  return cut;
}

// ---------------------------------------------------------------------------
// 1. Lists
// ---------------------------------------------------------------------------

async function readMetricool(): Promise<{ week: string | null; songs: ListedSong[]; problem: string | null }> {
  const res = await fetch(METRICOOL, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15" },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return { week: null, songs: [], problem: `Metricool could not be read (${res ? `HTTP ${res.status}` : "no answer"})` };
  const parsed = parseMetricool(await res.text());
  return { ...parsed, problem: parsed.songs.length ? null : "Metricool's page had no songs in the expected place (its layout may have changed)" };
}

async function readSpotify(run: Run, playlist: string): Promise<ListedSong[]> {
  const out: ListedSong[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < SPOTIFY_MAX_PAGES; page++) {
    const params: Record<string, string> = { id: playlist };
    if (cursor) params.cursor = cursor;
    const res = await sc<{ tracks?: unknown; cursor?: string | number | null }>(run, "/v1/spotify/playlist", params);
    if (!res) break;
    out.push(...parseSpotifyTracks(res.tracks));
    cursor = res.cursor != null && res.cursor !== "" ? String(res.cursor) : null;
    if (!cursor) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Measure
// ---------------------------------------------------------------------------

async function findClip(run: Run, w: Watch): Promise<{ clipId: string; name: string } | null> {
  const res = await sc<{ search_item_list?: { aweme_info?: { music?: SearchMusic } }[] }>(run, "/v1/tiktok/search/keyword", {
    query: `${w.title} ${w.artist}`,
    region: "US",
  });
  const musics = (res?.search_item_list ?? []).map((i) => i.aweme_info?.music).filter((m): m is SearchMusic => !!m);
  return pickClip(w, musics);
}

async function countVideos(run: Run, clipId: string): Promise<number | null> {
  const res = await sc<{ music_info?: { user_count?: number } }>(run, "/v1/tiktok/song", { clipId });
  const n = res?.music_info?.user_count;
  return typeof n === "number" && n >= 0 ? n : null;
}

// ---------------------------------------------------------------------------
// 4. The AI review
// ---------------------------------------------------------------------------

async function review(songs: Watch[]): Promise<Map<string, Review>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiUnavailable("The AI is not connected: OPENROUTER_API_KEY is not set");
  const list = songs.map((s) => ({ key: s.song_key, song: songName(s.artist, s.title), tiktok_sound: s.tiktok_title, new_videos_a_day: s.videos_per_day }));
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pm-dashboard-ashen.vercel.app",
      "X-Title": "PM Dashboard music refresh",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 6000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: `${REVIEW_PROMPT}\n\nSongs:\n${JSON.stringify(list)}` }],
    }),
    signal: AbortSignal.timeout(90_000),
  }).catch(() => null);
  if (!res) throw new AiUnavailable("The AI could not be reached");
  if (!res.ok) throw new AiUnavailable(res.status === 402 ? "The AI account is out of credit" : `The AI answered HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parseReviews(json.choices?.[0]?.message?.content ?? "");
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

export async function refreshMusicTrends(dry = false, now = new Date()): Promise<TrendReport> {
  const startedAt = now.toISOString();
  const today = startedAt.slice(0, 10);
  const [settings] = await db<Settings[]>("music_trend_settings?id=eq.1&select=*");
  if (!settings) throw new Error("music_trend_settings has no row");
  const run = new Run(dry, settings.credit_cap);
  const report: TrendReport = {
    dry,
    metricoolWeek: null,
    listed: { metricool: 0, spotify: 0 },
    measured: 0,
    noSoundFound: [],
    added: [],
    rejected: [],
    nowTrending: [],
    noLongerTrending: [],
    credits: 0,
    stoppedEarly: false,
    note: null,
  };
  const notes: string[] = [];

  const watch = await db<Watch[]>("music_trend_watch?select=*");
  const byKey = new Map(watch.map((w) => [w.song_key, w]));
  const changed = new Set<Watch>();
  const fresh = new Set<Watch>();
  const library = await db<LibrarySong[]>("music_library?select=id,artist,title,is_trending&is_active=eq.true");
  const libById = new Map(library.map((l) => [l.id, l]));

  const blank = (artist: string, title: string, key: string): Watch => ({
    id: "", song_key: key, artist, title, sources: [], first_listed: null, last_listed: null,
    tiktok_clip_id: null, tiktok_title: null, clip_searched_at: null, videos: null, checked_at: null,
    prev_videos: null, prev_checked_at: null, videos_per_day: null, status: "watching", reason: null, library_id: null,
  });

  // Every library song is watched.
  const watchedLib = new Set(watch.map((w) => w.library_id).filter(Boolean));
  for (const l of library) {
    if (watchedLib.has(l.id)) continue;
    const key = songKey(l.artist, l.title);
    let w = byKey.get(key);
    if (w && w.library_id) continue; // a duplicate library row of a watched song
    if (!w) {
      w = blank(l.artist, l.title, key);
      byKey.set(key, w);
      fresh.add(w);
    }
    w.status = "in_library";
    w.library_id = l.id;
    w.reason = w.reason ?? "in the library";
    changed.add(w);
  }

  // 1. Lists.
  const listed: ListedSong[] = [];
  if (settings.use_metricool) {
    const m = await readMetricool();
    report.metricoolWeek = m.week;
    if (m.problem) notes.push(m.problem);
    listed.push(...m.songs);
  }
  for (const p of settings.spotify_playlists) {
    const songs = await readSpotify(run, p);
    if (!songs.length) notes.push(`Spotify playlist ${p} gave no songs`);
    listed.push(...songs);
  }
  const onMetricool = new Set<string>();
  const listedNow = new Set<Watch>();
  for (const s of listed) {
    report.listed[s.source] += 1;
    const key = songKey(s.artist, s.title);
    let w = byKey.get(key);
    if (!w) {
      w = blank(firstArtist(s.artist), cleanTitle(s.title), key);
      byKey.set(key, w);
      fresh.add(w);
    }
    w.first_listed ??= today;
    w.last_listed = today;
    if (!w.sources.includes(s.source)) w.sources = [...w.sources, s.source];
    if (s.clipId && !w.tiktok_clip_id) {
      w.tiktok_clip_id = s.clipId;
      w.tiktok_title = `${s.artist} - ${s.title}`;
    }
    if (s.source === "metricool") onMetricool.add(key);
    listedNow.add(w);
    changed.add(w);
  }

  // 2. Measure: listed now first, then other recently listed songs, then
  // trending library songs, then library songs not checked for a while.
  const due = (w: Watch) => daysSince(w.checked_at, now) >= MEASURE_EVERY_DAYS;
  const searchable = (w: Watch) => !!w.tiktok_clip_id || daysSince(w.clip_searched_at, now) >= RESEARCH_DAYS;
  // A listed song is watched for `listed_window_days` after it first appears
  // (three weekly checks), or again whenever it is on Metricool's top 10: the
  // Spotify playlists keep old hits for months.
  const inWindow = (w: Watch) => onMetricool.has(w.song_key) || daysSince(w.first_listed, now) <= settings.listed_window_days;
  const rank = (w: Watch): number | null => {
    if (w.status === "rejected" || !due(w) || !searchable(w)) return null;
    if (listedNow.has(w) && inWindow(w)) return 0;
    if (w.status === "watching" && inWindow(w)) return 1;
    if (w.status === "in_library" && w.library_id && libById.get(w.library_id)?.is_trending) return 2;
    if (w.status === "in_library" && daysSince(w.checked_at, now) >= settings.library_recheck_days) return 3;
    return null;
  };
  const work = [...byKey.values()]
    .map((w) => ({ w, r: rank(w) }))
    .filter((x): x is { w: Watch; r: number } => x.r != null)
    .sort((a, b) => a.r - b.r || daysSince(b.w.checked_at, now) - daysSince(a.w.checked_at, now))
    .map((x) => x.w);

  const measured = new Set<Watch>();
  try {
    report.stoppedEarly = await pool(work, run, async (w) => {
      if (!w.tiktok_clip_id) {
        const clip = await findClip(run, w);
        w.clip_searched_at = new Date().toISOString();
        changed.add(w);
        if (!clip) {
          report.noSoundFound.push(songName(w.artist, w.title));
          return;
        }
        w.tiktok_clip_id = clip.clipId;
        w.tiktok_title = clip.name;
        if (run.stop) return;
      }
      const n = await countVideos(run, w.tiktok_clip_id!);
      if (n == null) return;
      const at = new Date().toISOString();
      if (w.videos != null && w.checked_at) {
        w.prev_videos = w.videos;
        w.prev_checked_at = w.checked_at;
      }
      w.videos = n;
      w.checked_at = at;
      w.videos_per_day = videosPerDay(w.prev_videos, w.prev_checked_at, n, at);
      measured.add(w);
      changed.add(w);
    });
  } catch (err) {
    if (!(err instanceof ScrapeCreatorsUnavailable)) throw err;
    notes.push(err.message);
    report.stoppedEarly = true;
  }
  report.measured = measured.size;

  // 3. Decide.
  const libPatches = new Map<string, Record<string, unknown>>();
  const toReview: Watch[] = [];
  for (const w of measured) {
    const trending = isTrending(w.videos_per_day, onMetricool.has(w.song_key), settings.min_videos_per_day);
    if (w.status === "watching") {
      if (trending) toReview.push(w);
      continue;
    }
    if (w.status !== "in_library" || !w.library_id) continue;
    const lib = libById.get(w.library_id);
    const patch: Record<string, unknown> = {
      tiktok_clip_id: w.tiktok_clip_id,
      tiktok_videos: w.videos,
      tiktok_videos_per_day: w.videos_per_day,
      trend_checked_at: w.checked_at,
    };
    if (trending != null && lib && trending !== lib.is_trending) {
      patch.is_trending = trending;
      patch.trending_since = trending ? today : null;
      (trending ? report.nowTrending : report.noLongerTrending).push(songName(w.artist, w.title));
    }
    libPatches.set(w.library_id, patch);
  }

  // 4. Review and add.
  const newRows: { w: Watch; row: Record<string, unknown> }[] = [];
  if (toReview.length) {
    try {
      for (let i = 0; i < toReview.length; i += 20) {
        const batch = toReview.slice(i, i + 20);
        const answers = await review(batch);
        for (const w of batch) {
          const a = answers.get(w.song_key);
          const name = songName(w.artist, w.title);
          if (!a) continue; // no answer: tried again next week
          if (!a.keep) {
            w.status = "rejected";
            w.reason = `AI: ${a.reason || "not a fit"}`;
            report.rejected.push({ song: name, reason: a.reason });
            changed.add(w);
            continue;
          }
          report.added.push({ song: name, videosPerDay: w.videos_per_day, known: a.known });
          newRows.push({
            w,
            row: {
              artist: w.artist,
              title: w.title,
              vibe_summary: a.vibe_summary || null,
              mood_tags: a.mood_tags,
              pillar_fit: ["universal"],
              tempo: a.tempo,
              genre: a.genre,
              era: a.era,
              // Every library song carries ig_trending = true; older pickers may filter on it.
              ig_trending: true,
              is_active: true,
              usage_count: 0,
              is_trending: true,
              trending_since: today,
              tiktok_clip_id: w.tiktok_clip_id,
              tiktok_videos: w.videos,
              tiktok_videos_per_day: w.videos_per_day,
              trend_checked_at: w.checked_at,
              added_by: "music_trend_refresh",
              notes: `Added by the weekly music refresh ${today} from ${w.sources.join(" + ")}${a.known ? "" : "; mood guessed by the AI (it did not know the song)"}. ${a.reason}`.trim(),
            },
          });
          report.nowTrending.push(name);
        }
      }
    } catch (err) {
      if (!(err instanceof AiUnavailable)) throw err;
      notes.push(`${err.message}; ${toReview.length - newRows.length - report.rejected.length} trending songs wait for next week`);
    }
  }

  report.credits = run.credits;
  report.note = notes.length ? notes.join(". ") : null;
  if (dry) return report;

  // Writes.
  for (const { w, row } of newRows) {
    const [made] = await db<{ id: string }[]>("music_library?select=id", { method: "POST", headers: RETURN_HEADERS, body: JSON.stringify(row) });
    w.status = "in_library";
    w.library_id = made?.id ?? null;
    w.reason = "added as trending";
    changed.add(w);
  }
  for (const [id, patch] of libPatches) {
    await db(`music_library?id=eq.${id}`, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(patch) });
  }
  const fields = (w: Watch) => ({
    song_key: w.song_key, artist: w.artist, title: w.title, sources: w.sources, first_listed: w.first_listed,
    last_listed: w.last_listed, tiktok_clip_id: w.tiktok_clip_id, tiktok_title: w.tiktok_title,
    clip_searched_at: w.clip_searched_at, videos: w.videos, checked_at: w.checked_at, prev_videos: w.prev_videos,
    prev_checked_at: w.prev_checked_at, videos_per_day: w.videos_per_day, status: w.status, reason: w.reason,
    library_id: w.library_id,
  });
  const inserts = [...changed].filter((w) => fresh.has(w)).map(fields);
  for (let i = 0; i < inserts.length; i += 200) {
    await db("music_trend_watch?on_conflict=song_key", {
      method: "POST",
      headers: { ...JSON_HEADERS, Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify(inserts.slice(i, i + 200)),
    });
  }
  for (const w of changed) {
    if (fresh.has(w)) continue;
    await db(`music_trend_watch?id=eq.${w.id}`, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(fields(w)) });
  }
  await db("music_trend_runs", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      dry,
      listed: listed.length,
      measured: report.measured,
      added: report.added.length,
      rejected: report.rejected.length,
      now_trending: report.nowTrending.length,
      credits: report.credits,
      stopped_early: report.stoppedEarly,
      note: report.note,
      report,
    }),
  });
  return report;
}
