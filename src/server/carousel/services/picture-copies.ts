/**
 * Small copies of the library and Trends pictures, made once and kept on
 * Cloudflare R2 (Garreth, 2026-11-04).
 *
 * The screens show pictures through `thumbUrl` (src/lib/carousel/thumb.ts).
 * Until now Supabase made a resized copy the first time each picture was
 * shown, and every one of those first showings meant a lookup in our
 * database: on 2026-10-09 two hundred of them at once filled the connection
 * pool and hung the dashboard. This makes the copies in advance, 540 and 1080
 * wide, and puts them where Cloudflare serves them without asking Supabase.
 *
 * It finds its own work: `picture_copies_todo` lists every picture in the two
 * buckets that has no copy yet, or whose original changed since its copy was
 * made (the slide copier and the bucket tool both overwrite at the same path),
 * library pictures first, then newest. So it does not matter which of the
 * many things that add pictures added this one. It runs daily, stops when its
 * time is up, and can be run again at any time; `picture_copies` remembers what
 * is done. The originals are only read, never changed.
 */
import decode from "heic-decode";
import sharp from "sharp";
import { dbInsert, dbRpc } from "@/server/carousel/repo/db";
import { logError } from "@/server/carousel/log";
import { encodeKey, r2Configured, r2Put } from "@/server/r2";
import { COPY_WIDTHS, copyKey } from "@/lib/carousel/thumb";

/** Supabase's own resizer refuses beyond these, so the fallback could not show them either. */
const MAX_BYTES = 25_000_000;
const MAX_PIXELS = 50_000_000;
const QUALITY = 75;

interface Todo {
  bucket: string;
  path: string;
  version: string;
  size: number | null;
  mimetype: string | null;
  attempts: number;
  remaining: number;
}

export interface CopiesReport {
  made: number;
  failed: number;
  /** Pictures still without a copy after this run. */
  remaining: number;
  stoppedFor: "done" | "time" | "limit";
  /** What this run made, when asked for a few (`limit`), so they can be looked at. */
  samples?: { bucket: string; path: string; copies: string[]; bytes: number[] }[];
}

/** A picture that will never copy, as opposed to a hiccup worth trying again. */
class Refused extends Error {}

async function original(t: Todo): Promise<Buffer> {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
  const res = await fetch(`${base}/storage/v1/object/${encodeKey(t.bucket)}/${encodeKey(t.path)}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(60_000), cache: "no-store" });
  if (res.status === 404 || res.status === 400) throw new Refused(`the original is gone (HTTP ${res.status})`);
  if (!res.ok) throw new Error(`could not read the original (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function open(bytes: Buffer, t: Todo): Promise<sharp.Sharp> {
  if (/\.hei[cf]$/i.test(t.path) || /hei[cf]/i.test(t.mimetype ?? "")) {
    const { width, height, data } = await decode({ buffer: bytes });
    if (width * height > MAX_PIXELS) throw new Refused(`${width} by ${height} is over the 50 megapixel limit`);
    return sharp(Buffer.from(data), { raw: { width, height, channels: 4 } });
  }
  const img = sharp(bytes, { limitInputPixels: MAX_PIXELS });
  const meta = await img.metadata().catch(() => {
    throw new Refused("not a picture sharp can read");
  });
  if (!meta.width || !meta.height) throw new Refused("not a picture sharp can read");
  if (meta.width * meta.height > MAX_PIXELS) throw new Refused(`${meta.width} by ${meta.height} is over the 50 megapixel limit`);
  return img.rotate();
}

async function makeOne(t: Todo): Promise<{ copies: string[]; bytes: number[] }> {
  if ((t.size ?? 0) > MAX_BYTES) throw new Refused(`the original is ${Math.round((t.size ?? 0) / 1e6)} MB, over the 25 MB limit`);
  const img = await open(await original(t), t);
  const copies: string[] = [];
  const bytes: number[] = [];
  for (const w of COPY_WIDTHS) {
    const out = await img.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer();
    const key = copyKey(t.bucket, t.path, w);
    await r2Put(key, out, "image/webp");
    copies.push(key);
    bytes.push(out.length);
  }
  return { copies, bytes };
}

export async function makeOutstandingCopies(opts: { budgetMs: number; atOnce?: number; limit?: number }): Promise<CopiesReport> {
  if (!r2Configured()) throw new Error("R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)");
  const started = Date.now();
  // Gentle on Supabase: each copy reads one original from its storage.
  const atOnce = Math.max(1, Math.min(6, opts.atOnce ?? 3));
  const tried = new Set<string>();
  const samples: NonNullable<CopiesReport["samples"]> = [];
  let made = 0;
  // Failures that may be tried again stay in the list, so ask for that many more.
  let retryable = 0;
  let failed = 0;
  let remaining = 0;
  let stoppedFor: CopiesReport["stoppedFor"] = "done";
  const outOfTime = () => Date.now() - started > opts.budgetMs;
  while (true) {
    const left = opts.limit ? opts.limit - tried.size : 50;
    if (left <= 0) {
      stoppedFor = "limit";
      break;
    }
    const page = await dbRpc<Todo[]>("picture_copies_todo", { p_limit: Math.min(50, left) + retryable });
    remaining = Number(page[0]?.remaining ?? 0);
    // A picture that failed is listed again until its third try; once per run is enough.
    const todo = page.filter((t) => !tried.has(`${t.bucket}/${t.path}`)).slice(0, Math.min(50, left));
    if (!todo.length) break;
    let next = 0;
    const worker = async () => {
      while (next < todo.length && !outOfTime()) {
        const t = todo[next++];
        tried.add(`${t.bucket}/${t.path}`);
        const row = { bucket: t.bucket, path: t.path, version: t.version, made_at: new Date().toISOString(), attempts: t.attempts + 1 };
        try {
          const { copies, bytes } = await makeOne(t);
          await dbInsert("picture_copies", [{ ...row, status: "done", error: null, bytes_540: bytes[0], bytes_1080: bytes[1] }], { upsert: "bucket,path" });
          made++;
          remaining--;
          if (opts.limit) samples.push({ bucket: t.bucket, path: t.path, copies, bytes });
        } catch (err) {
          failed++;
          if (!(err instanceof Refused) && row.attempts < 3) retryable++;
          const message = err instanceof Error ? err.message : String(err);
          // A refusal is final: it is not tried again until the original changes.
          await dbInsert("picture_copies", [{ ...row, status: "failed", error: message.slice(0, 500), attempts: err instanceof Refused ? 99 : row.attempts }], { upsert: "bucket,path" }).catch((e) => logError("record failed copy", e));
          logError(`copy picture ${t.bucket}/${t.path}`, err);
        }
      }
    };
    await Promise.all(Array.from({ length: atOnce }, worker));
    if (outOfTime()) {
      stoppedFor = "time";
      break;
    }
  }
  return { made, failed, remaining: Math.max(0, remaining), stoppedFor, ...(opts.limit ? { samples } : {}) };
}
