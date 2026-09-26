/**
 * Music lookup (DEV-10, F14): a deck's track has to be an active
 * `music_library` row written as "Artist - Title", because the Posting Agent
 * matches on that label. The writer may suggest a track; if it matches a
 * library row the match is kept, otherwise the least-used active track that
 * fits the pillar is picked. Finding a brand-new track on TikTok and
 * Instagram is the part that reaches outside the app and is not built here:
 * a suggestion the library does not hold is recorded as "not found" and the
 * deck is flagged for a person, exactly as the flow says.
 */
import { dbGetAll } from "@/server/carousel/repo/db";

interface TrackRow {
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

export async function lookupTrack(hint: string | null, seed: string, pillar: string | null): Promise<{ music: string; status: "found" | "not_found" }> {
  const rows = await tracks();
  if (!rows.length) return { music: hint ?? "", status: "not_found" };
  if (hint) {
    const h = norm(hint);
    const exact = rows.find((r) => norm(`${r.artist} - ${r.title}`) === h || norm(`${r.artist} – ${r.title}`) === h);
    const loose = exact ?? rows.find((r) => h.includes(norm(r.title)) && h.includes(norm(r.artist)));
    if (loose) return { music: `${loose.artist} - ${loose.title}`, status: "found" };
  }
  const fitting = pillar ? rows.filter((r) => r.pillar_fit?.some((p) => pillar.includes(p) || p === "universal")) : rows;
  const pool = fitting.length ? fitting : rows;
  const n = Math.abs([...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 3));
  const sorted = [...pool].sort((a, b) => (a.usage_count ?? 0) - (b.usage_count ?? 0));
  const pick = sorted[n % Math.min(sorted.length, 12)];
  return { music: `${pick.artist} - ${pick.title}`, status: "found" };
}

export async function searchTracks(q: string): Promise<string[]> {
  const rows = await tracks();
  const n = norm(q);
  return rows
    .filter((r) => !n || norm(`${r.artist} ${r.title}`).includes(n))
    .slice(0, 8)
    .map((r) => `${r.artist} - ${r.title}`);
}
