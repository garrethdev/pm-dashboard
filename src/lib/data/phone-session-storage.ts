import { signStorageUrls } from "@/lib/data/storage-sign";

/**
 * The private bucket the Air's session frames go in (PF-26). Every call here
 * uses the service key and runs on the server. The Air never holds that key:
 * it is handed a one-time signed link per frame, which is also how a session
 * of a few hundred pictures gets past the few megabytes one request to the
 * dashboard may carry.
 */
export const SESSIONS_BUCKET = "phone-sessions";
const TIMEOUT_MS = 30_000;

function base(): string {
  const b = process.env.SUPABASE_URL;
  if (!b) throw new Error("SUPABASE_URL is not configured");
  return `${b}/storage/v1`;
}

function auth(extra: Record<string, string> = {}): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

const safe = (path: string) => path.split("/").map(encodeURIComponent).join("/");

async function fail(res: Response, what: string): Promise<never> {
  const body = await res.text().catch(() => "");
  let message = `HTTP ${res.status}`;
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    message = parsed.message ?? parsed.error ?? message;
  } catch {
    if (body) message = body.slice(0, 200);
  }
  throw new Error(`${what}: ${message}`);
}

/** A one-time link the Air can PUT one frame to. */
export async function signFrameUpload(path: string): Promise<string> {
  const res = await fetch(`${base()}/object/upload/sign/${SESSIONS_BUCKET}/${safe(path)}`, {
    method: "POST",
    // x-upsert: a frame sent twice (a retry after a timeout) overwrites itself.
    headers: auth({ "Content-Type": "application/json", "x-upsert": "true" }),
    body: "{}",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) await fail(res, "sign frame upload");
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("sign frame upload: no link returned");
  return `${base()}${json.url}`;
}

/**
 * Every file under a folder of the bucket, as paths, in name order. Pages
 * through the listing, because a session can have more frames than one
 * page holds.
 */
export async function listFrames(prefix: string): Promise<string[]> {
  const out: string[] = [];
  const page = 1000;
  for (let offset = 0; ; offset += page) {
    const res = await fetch(`${base()}/object/list/${SESSIONS_BUCKET}`, {
      method: "POST",
      headers: auth({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefix, limit: page, offset, sortBy: { column: "name", order: "asc" } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) await fail(res, "list frames");
    const rows = (await res.json()) as { name: string; id: string | null }[];
    // A folder entry has no id; a file does.
    for (const r of rows) if (r.id) out.push(`${prefix}${r.name}`);
    if (rows.length < page) break;
  }
  return out.sort();
}

/** One frame's bytes. Null when it is not there. */
export async function readFrame(path: string): Promise<{ bytes: Buffer; type: string } | null> {
  const res = await fetch(`${base()}/object/${SESSIONS_BUCKET}/${safe(path)}`, {
    headers: auth(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) await fail(res, "read frame");
  return { bytes: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") ?? "image/jpeg" };
}

/** Ten-minute links for the reviewer's browser, keyed by path. Never cached. */
export function signFrameUrls(paths: string[], expiresInSeconds = 600): Promise<Record<string, string>> {
  return signStorageUrls(SESSIONS_BUCKET, paths, expiresInSeconds);
}
