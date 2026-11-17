/**
 * The rules of the weekly music list refresh (src/server/music-trends.ts),
 * kept apart so they can be tested without the network.
 */

export type TrendSource = "metricool" | "spotify";

export interface ListedSong {
  artist: string;
  title: string;
  source: TrendSource;
  /** TikTok sound id, when the list links the sound (Metricool does). */
  clipId: string | null;
}

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

/** "Song (feat. X)" and "Song [with Y]" are the same song as "Song". */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[([](?:feat\.?|ft\.?|featuring|with)\s[^)\]]*[)\]]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Ian Asher & D A N N Y" → "Ian Asher". Yurie searches by the main artist. */
export function firstArtist(artists: string): string {
  return artists.split(/\s*(?:,|&| x | feat\.? | ft\.? )\s*/i)[0]!.trim();
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** One key per song, whatever list it came from. */
export function songKey(artist: string, title: string): string {
  return `${norm(firstArtist(artist))} - ${norm(cleanTitle(title))}`;
}

/** The name written on posts and in the library: "Artist - Title". */
export function songName(artist: string, title: string): string {
  return `${firstArtist(artist)} - ${cleanTitle(title)}`;
}

/**
 * Metricool's weekly "Trending TikTok Songs This Week" page: ten headings like
 * `10) <a href="https://www.tiktok.com/music/V-Cut-7472402932984317953">V-Cut – Ghetto Baby Boom</a>`.
 */
export function parseMetricool(html: string): { week: string | null; songs: ListedSong[] } {
  const week = html.match(/Trending TikTok Songs This Week:\s*([^<]+)/i)?.[1]?.trim() ?? null;
  const songs: ListedSong[] = [];
  const re = /<h3[^>]*>\s*\d+\)\s*<a[^>]*href="https?:\/\/(?:www\.)?tiktok\.com\/music\/[^"]*?-(\d{8,})"[^>]*>([^<]+)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const text = decodeEntities(m[2]!).trim();
    const at = text.search(/\s[–—-]\s/);
    if (at < 0) continue;
    const title = text.slice(0, at).trim();
    const artist = text.slice(at + 3).trim();
    if (title && artist) songs.push({ artist, title, source: "metricool", clipId: m[1]! });
  }
  return { week, songs };
}

interface SpotifyTrack {
  __typename?: string;
  name?: string;
  artists?: { profile?: { name?: string } }[];
}

/** A ScrapeCreators Spotify playlist page. Tracks Spotify hides ("RestrictedContent") are skipped. */
export function parseSpotifyTracks(tracks: unknown): ListedSong[] {
  if (!Array.isArray(tracks)) return [];
  const out: ListedSong[] = [];
  for (const t of tracks as SpotifyTrack[]) {
    if (t?.__typename !== "Track" || !t.name) continue;
    const artist = t.artists?.[0]?.profile?.name;
    if (artist) out.push({ artist, title: t.name, source: "spotify", clipId: null });
  }
  return out;
}

export interface SearchMusic {
  id_str?: string;
  title?: string;
  author?: string;
  is_original_sound?: boolean;
}

/**
 * The song's own TikTok sound, from a keyword search's videos: a released
 * (not "original sound") sound with the same title, preferring the right
 * artist, then the one most videos in the results use. Null when none.
 */
export function pickClip(song: { artist: string; title: string }, musics: SearchMusic[]): { clipId: string; name: string } | null {
  const want = norm(cleanTitle(song.title));
  const artist = norm(firstArtist(song.artist));
  const score = new Map<string, { n: number; artistMatch: boolean; name: string }>();
  for (const m of musics) {
    if (!m?.id_str || m.is_original_sound || !m.title) continue;
    if (norm(cleanTitle(m.title)) !== want) continue;
    const by = norm(m.author ?? "");
    const artistMatch = !!by && !!artist && (by.includes(artist) || artist.includes(by));
    const s = score.get(m.id_str) ?? { n: 0, artistMatch, name: `${m.author ?? ""} - ${m.title}` };
    s.n += 1;
    score.set(m.id_str, s);
  }
  let best: [string, { n: number; artistMatch: boolean; name: string }] | null = null;
  for (const e of score) {
    const [, s] = e;
    if (!best || (s.artistMatch && !best[1].artistMatch) || (s.artistMatch === best[1].artistMatch && s.n > best[1].n)) best = e;
  }
  return best ? { clipId: best[0], name: best[1].name } : null;
}

const DAY = 86_400_000;

/** New videos a day between two counts, or null when the checks are under 3 days apart. */
export function videosPerDay(prev: number | null, prevAt: string | null, now: number, nowAt: string): number | null {
  if (prev == null || !prevAt) return null;
  const days = (Date.parse(nowAt) - Date.parse(prevAt)) / DAY;
  if (!(days >= 3)) return null;
  return Math.max(0, Math.round((now - prev) / days));
}

/**
 * Is the song trending this week? A measured growth decides. Without one (a
 * song's first check), being on Metricool's weekly top 10 counts, as it is the
 * only list that is this week's; otherwise it is unknown until next week.
 */
export function isTrending(vpd: number | null, onMetricoolNow: boolean, minPerDay: number): boolean | null {
  if (vpd != null) return vpd >= minPerDay;
  return onMetricoolNow ? true : null;
}

/** Days since an ISO time (Infinity when never). */
export function daysSince(iso: string | null, now: Date): number {
  return iso ? (now.getTime() - Date.parse(iso)) / DAY : Infinity;
}

export const MOODS = [
  "confident", "payoff", "sultry", "slow-burn", "hype", "ethereal", "chill", "introspective", "dreamy", "playful",
  "self-assured", "warm", "soft-life", "intimate", "vulnerable", "victory", "atmospheric", "feel-good", "empowered",
  "cinematic", "anthem", "melancholic", "defiant", "unbothered", "self-love", "breakup", "emotional", "nostalgic",
  "romantic", "uplifting", "glow-up", "heartbreak", "luxury", "celebration",
];

export const REVIEW_PROMPT = `You review songs that are trending on TikTok right now, before they join the music list for our posts.

Our posts are TikTok and Instagram photo carousels by a white, middle-aged woman telling her own story: losing weight (GLP-1), jealousy and comparing herself with other women, getting over a divorce, glowing up, and a comfortable, lavish life. A person picks one song from the list for each post.

For each song decide "keep": could it sit under one of these posts?
Reject (keep false) if it is: a meme or novelty sound, a sound effect, a video-game or anime track used as a meme, a children's song, a sports chant, spoken audio, or a song mainly about drugs, violence or hate. Explicit lyrics alone are fine. Instrumentals that set a mood are fine.

For every song also write, even when you do not know it well (then guess from the title, artist and genre and say so in vibe_summary):
- vibe_summary: one sentence on how it feels and what kind of post it suits
- mood_tags: 2 to 4 tags, from this list where possible: ${MOODS.join(", ")}
- tempo: one of slow, mid, upbeat, hype
- genre: short, e.g. "R&B", "indie-pop"
- era: the decade it was released, e.g. "2020s"
- known: true if you know this song, false if you are guessing
- reason: a few words on why you kept or rejected it

Reply with JSON only: {"results":[{"key":"<the key you were given>","keep":true,"reason":"","known":true,"vibe_summary":"","mood_tags":[],"tempo":"","genre":"","era":""}]}`;

export interface Review {
  keep: boolean;
  reason: string;
  known: boolean;
  vibe_summary: string;
  mood_tags: string[];
  tempo: string | null;
  genre: string | null;
  era: string | null;
}

/** Reads the AI's answer. Songs it did not answer for are missing from the map. */
export function parseReviews(content: string): Map<string, Review> {
  const out = new Map<string, Review>();
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return out;
  let parsed: { results?: Record<string, unknown>[] };
  try {
    parsed = JSON.parse(content.slice(start, end + 1));
  } catch {
    return out;
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  for (const r of parsed.results ?? []) {
    const key = str(r.key);
    if (!key) continue;
    const tempo = str(r.tempo)?.toLowerCase() ?? null;
    out.set(key, {
      keep: r.keep === true,
      reason: str(r.reason) ?? "",
      known: r.known !== false,
      vibe_summary: str(r.vibe_summary) ?? "",
      mood_tags: Array.isArray(r.mood_tags) ? r.mood_tags.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase().trim()).slice(0, 4) : [],
      tempo: tempo && ["slow", "mid", "upbeat", "hype"].includes(tempo) ? tempo : null,
      genre: str(r.genre),
      era: str(r.era),
    });
  }
  return out;
}
