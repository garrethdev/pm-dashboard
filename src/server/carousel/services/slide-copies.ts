/**
 * Our own copy of every reference carousel's pictures (Garreth, 2026-09-29:
 * "download and store them locally rather than referencing an outside
 * system").
 *
 * A carousel's cover and slides arrive as links to somebody else's storage:
 * TikTok's signed links, which expire about two weeks after a scrape, or
 * Virlo's, which could change or go away. This copies each picture into the
 * public bucket `reference-slides` and records it in
 * `reference_slide_images`, position 0 for the cover and 1..n for the
 * slides. The Trends reader uses the copy first.
 *
 * It works newest first and stops when its time is up, so it can run on a
 * schedule in small pieces and be run again at any time. A picture already
 * copied is skipped. A link that has expired is only copied when a fresh
 * link for it is waiting in `reference_media_refresh`.
 */
import decode from "heic-decode";
import sharp from "sharp";
import { dbGet, dbInsert } from "@/server/carousel/repo/db";
import { logError } from "@/server/carousel/log";
import { isExpired } from "@/server/carousel/media";

const BUCKET = "reference-slides";
const PAGE = 1000;

interface Wanted {
  ref: number;
  position: number;
  url: string;
  from: string;
}

export interface CopyReport {
  copied: number;
  failed: number;
  /** Pictures whose link has expired and for which no fresh link is known. */
  gone: number;
  /** Pictures still to copy after this run. */
  remaining: number;
  stoppedFor: "done" | "time";
}

async function all<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const rows = await dbGet<T[]>(`${path}${path.includes("?") ? "&" : "?"}limit=${PAGE}&offset=${offset}`);
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

const base = () => {
  const b = process.env.SUPABASE_URL;
  if (!b) throw new Error("SUPABASE_URL is not configured");
  return b;
};
const auth = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return { apikey: key, Authorization: `Bearer ${key}` };
};
const isOurs = (u: string) => u.startsWith(`${base()}/storage/v1/object/public/${BUCKET}/`);
const isLink = (u: unknown): u is string => typeof u === "string" && /^https?:\/\//.test(u);

/** Every picture we do not hold yet, newest reference first. */
async function outstanding(): Promise<{ todo: Wanted[]; record: { reference_id: number; position: number; url: string; source_url: string | null }[]; gone: number }> {
  const [refs, have, analyses, evidence, fresh] = await Promise.all([
    all<{ id: number; thumbnail_url: string | null }>("references_unified?select=id,thumbnail_url&format=eq.carousel&order=id.desc"),
    all<{ reference_id: number; position: number }>("reference_slide_images?select=reference_id,position"),
    all<{ source_reference_id: number; analysis_version: string; inventory: { position?: number; image_url?: string; source_image_url?: string }[] | null }>("reference_analysis?select=source_reference_id,analysis_version,inventory:observed->media_inventory"),
    all<{ source_reference_id: number; media_urls: string[] | null }>("source_discovery_evidence?select=source_reference_id,media_urls&source_format=eq.carousel&source_reference_id=not.is.null"),
    all<{ reference_id: number; images: string[] | null }>("reference_media_refresh?select=reference_id,images"),
  ]);
  const held = new Set(have.map((h) => `${h.reference_id}:${h.position}`));
  const freshBy = new Map(fresh.map((f) => [f.reference_id, f.images ?? []]));
  const rank = (v: string) => (v === "perez-slides-v1" ? 2 : v === "phase0-multiformat-v1" ? 1 : 0);
  const lists = new Map<number, { rank: number; slides: { position: number; url: string; was: string | null }[] }>();
  for (const a of analyses) {
    if (!Array.isArray(a.inventory) || !a.inventory.length) continue;
    const cur = lists.get(a.source_reference_id);
    if (cur && cur.rank >= rank(a.analysis_version)) continue;
    // A slide's place is where it falls in the order, counted from 1. The
    // stored number cannot be trusted for that: some inventories count from
    // 0, which would put the first slide in the cover's place and every
    // other slide one off. The Trends reader counts the same way.
    const slides = [...a.inventory]
      .sort((x, y) => (x.position ?? 0) - (y.position ?? 0))
      .map((m, i) => ({ position: i + 1, url: m.image_url ?? "", was: m.source_image_url ?? null }))
      .filter((s) => isLink(s.url));
    lists.set(a.source_reference_id, { rank: rank(a.analysis_version), slides });
  }
  for (const e of evidence) {
    if (lists.has(e.source_reference_id) || !Array.isArray(e.media_urls)) continue;
    lists.set(e.source_reference_id, { rank: -1, slides: e.media_urls.map((url, i) => ({ position: i + 1, url, was: null })).filter((s) => isLink(s.url)) });
  }
  const todo: Wanted[] = [];
  const record: { reference_id: number; position: number; url: string; source_url: string | null }[] = [];
  let gone = 0;
  for (const r of refs) {
    const pictures = [...(isLink(r.thumbnail_url) ? [{ position: 0, url: r.thumbnail_url, was: null }] : []), ...(lists.get(r.id)?.slides ?? [])];
    for (const p of pictures) {
      if (held.has(`${r.id}:${p.position}`)) continue;
      // A copy made before the table existed: write it down, nothing to fetch.
      if (isOurs(p.url)) {
        record.push({ reference_id: r.id, position: p.position, url: p.url, source_url: p.was });
        continue;
      }
      let from = p.url;
      if (isExpired(p.url)) {
        const again = p.position > 0 ? freshBy.get(r.id)?.[p.position - 1] : undefined;
        if (!isLink(again) || isExpired(again)) {
          gone++;
          continue;
        }
        from = again;
      }
      todo.push({ ref: r.id, position: p.position, url: p.url, from });
    }
  }
  return { todo, record, gone };
}

async function copyOne(w: Wanted): Promise<string> {
  const res = await fetch(w.from, { signal: AbortSignal.timeout(30_000), headers: { Accept: "image/*" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let bytes: Buffer = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get("content-type") ?? "";
  const path = new URL(w.from).pathname.toLowerCase();
  let ext = "jpg";
  let out = "image/jpeg";
  if (path.endsWith(".heic") || /hei[cf]/.test(type)) {
    const { width, height, data } = await decode({ buffer: bytes });
    bytes = await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).jpeg({ quality: 85 }).toBuffer();
  } else if (path.endsWith(".webp") || /webp/.test(type)) {
    ext = "webp";
    out = "image/webp";
  } else if (path.endsWith(".png") || /png/.test(type)) {
    ext = "png";
    out = "image/png";
  }
  const meta = await sharp(bytes).metadata();
  if (!meta.width || !meta.height) throw new Error("not a picture");
  const key = `${w.ref}/${w.position === 0 ? "cover" : w.position}.${ext}`;
  const up = await fetch(`${base()}/storage/v1/object/${BUCKET}/${key}`, { method: "POST", headers: { ...auth(), "Content-Type": out, "x-upsert": "true" }, body: new Uint8Array(bytes), signal: AbortSignal.timeout(30_000) });
  if (!up.ok) throw new Error(`store: HTTP ${up.status}`);
  return `${base()}/storage/v1/object/public/${BUCKET}/${key}`;
}

export async function copyOutstanding(opts: { budgetMs: number; atOnce?: number }): Promise<CopyReport> {
  const started = Date.now();
  const { todo, record, gone } = await outstanding();
  for (let i = 0; i < record.length; i += 500) await dbInsert("reference_slide_images", record.slice(i, i + 500), { upsert: "reference_id,position" });
  const atOnce = Math.max(1, Math.min(12, opts.atOnce ?? 6));
  let copied = 0;
  let failed = 0;
  let next = 0;
  let outOfTime = false;
  const worker = async () => {
    while (next < todo.length) {
      if (Date.now() - started > opts.budgetMs) {
        outOfTime = true;
        return;
      }
      const w = todo[next++];
      try {
        const url = await copyOne(w);
        await dbInsert("reference_slide_images", [{ reference_id: w.ref, position: w.position, url, source_url: w.url }], { upsert: "reference_id,position" });
        copied++;
      } catch (err) {
        failed++;
        logError(`copy picture ${w.ref}:${w.position}`, err);
      }
    }
  };
  await Promise.all(Array.from({ length: atOnce }, worker));
  return { copied, failed, gone, remaining: Math.max(0, todo.length - next), stoppedFor: outOfTime ? "time" : "done" };
}
