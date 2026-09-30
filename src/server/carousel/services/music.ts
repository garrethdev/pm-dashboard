/**
 * Music lookup (DEV-10, F14): a deck's track has to be an active
 * `music_library` row written as "Artist - Title", because the Posting Agent
 * matches on that label. The writer may suggest a track; if it matches a
 * library row the match is kept, otherwise the least-used active track that
 * fits the pillar is picked.
 *
 * When the library does not hold what the writer asked for, the swap is
 * said out loud (Garreth, 2026-09-29): the status is "substituted" and the
 * track the writer asked for is kept beside it, so the deck card can show
 * both and a person can change it. The deck is not flagged for it; in Auto
 * that would rewrite and then drop a deck over its music alone. Only an
 * empty library is "not found". Finding a brand-new track on TikTok and
 * Instagram reaches outside the app and is not built here.
 */
import { dbGetAll } from "@/server/carousel/repo/db";

export interface TrackRow {
  id: string;
  artist: string;
  title: string;
  pillar_fit: string[] | null;
  usage_count: number | null;
}

let cache: { at: number; rows: TrackRow[] } | null = null;

async function tracks(): Promise<TrackRow[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.rows;
  const rows = await dbGetAll<TrackRow>("music_library?select=id,artist,title,pillar_fit,usage_count&is_active=eq.true");
  cache = { at: Date.now(), rows };
  return rows;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export interface TrackChoice {
  music: string;
  status: "found" | "substituted" | "not_found";
  /** What the writer asked for, when that is not what was attached. */
  asked: string | null;
}

export async function lookupTrack(hint: string | null, seed: string, pillar: string | null): Promise<TrackChoice> {
  return chooseTrack(await tracks(), hint, seed, pillar);
}

export function chooseTrack(rows: TrackRow[], hint: string | null, seed: string, pillar: string | null): TrackChoice {
  const asked = hint?.trim() || null;
  if (!rows.length) return { music: asked ?? "", status: "not_found", asked };
  if (hint) {
    const h = norm(hint);
    const exact = rows.find((r) => norm(`${r.artist} - ${r.title}`) === h || norm(`${r.artist} – ${r.title}`) === h);
    const loose = exact ?? rows.find((r) => h.includes(norm(r.title)) && h.includes(norm(r.artist)));
    if (loose) return { music: `${loose.artist} - ${loose.title}`, status: "found", asked: null };
  }
  const fitting = pillar ? rows.filter((r) => r.pillar_fit?.some((p) => pillar.includes(p) || p === "universal")) : rows;
  const pool = fitting.length ? fitting : rows;
  const n = Math.abs([...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 3));
  const sorted = [...pool].sort((a, b) => (a.usage_count ?? 0) - (b.usage_count ?? 0));
  const pick = sorted[n % Math.min(sorted.length, 12)];
  // The writer asked for something the library does not have: say so.
  return { music: `${pick.artist} - ${pick.title}`, status: asked ? "substituted" : "found", asked };
}

export async function searchTracks(q: string): Promise<string[]> {
  const rows = await tracks();
  const n = norm(q);
  return rows
    .filter((r) => !n || norm(`${r.artist} ${r.title}`).includes(n))
    .slice(0, 8)
    .map((r) => `${r.artist} - ${r.title}`);
}
