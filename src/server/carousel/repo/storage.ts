/**
 * The library's storage bucket (DEV-29). Every call uses the service-role
 * key. A person's browser never gets that key: to upload, it is handed a
 * one-time signed link for one path, which is how a 20 MB photograph gets
 * past the few megabytes a server route may receive.
 */
export const LIBRARY_BUCKET = "image-libraries";
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

export function publicUrl(path: string): string {
  return `${base()}/object/public/${LIBRARY_BUCKET}/${safe(path)}`;
}

/** A one-time link the browser can PUT one file to. */
export async function signUpload(path: string): Promise<string> {
  const res = await fetch(`${base()}/object/upload/sign/${LIBRARY_BUCKET}/${safe(path)}`, { method: "POST", headers: auth({ "Content-Type": "application/json" }), body: "{}", signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) await fail(res, "sign upload");
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("sign upload: no link returned");
  return `${base()}${json.url}`;
}

export async function readObject(path: string): Promise<{ bytes: Buffer; type: string } | null> {
  const res = await fetch(`${base()}/object/${LIBRARY_BUCKET}/${safe(path)}`, { headers: auth(), signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) await fail(res, "read image");
  return { bytes: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") ?? "application/octet-stream" };
}

export async function writeObject(path: string, bytes: Buffer, type: string): Promise<void> {
  const res = await fetch(`${base()}/object/${LIBRARY_BUCKET}/${safe(path)}`, { method: "POST", headers: auth({ "Content-Type": type, "x-upsert": "true" }), body: new Uint8Array(bytes), signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) await fail(res, "store image");
}

export async function removeObject(path: string): Promise<void> {
  const res = await fetch(`${base()}/object/${LIBRARY_BUCKET}/${safe(path)}`, { method: "DELETE", headers: auth(), signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok && res.status !== 404 && res.status !== 400) await fail(res, "remove image");
}

// ── Linked folders (Garreth, 2026-10-08) ────────────────────────────────

export interface StorageEntry {
  /** The path inside the bucket. */
  path: string;
  name: string;
  /** A folder has no id in the listing. */
  folder: boolean;
  mimetype: string | null;
  size: number | null;
}

/** The public link to an object in any of our public buckets. */
export function bucketUrl(bucket: string, path: string): string {
  return `${base()}/object/public/${encodeURIComponent(bucket)}/${safe(path)}`;
}

export async function listBuckets(): Promise<{ id: string; public: boolean }[]> {
  const res = await fetch(`${base()}/bucket`, { headers: auth(), signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) await fail(res, "list buckets");
  const rows = (await res.json()) as { id: string; public: boolean }[];
  return rows.map((b) => ({ id: b.id, public: Boolean(b.public) })).sort((a, b) => a.id.localeCompare(b.id));
}

/** One level of a bucket: its folders and files under a prefix. */
export async function listFolder(bucket: string, prefix: string): Promise<StorageEntry[]> {
  const out: StorageEntry[] = [];
  const page = 1000;
  for (let offset = 0; ; offset += page) {
    const res = await fetch(`${base()}/object/list/${encodeURIComponent(bucket)}`, {
      method: "POST",
      headers: auth({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefix, limit: page, offset, sortBy: { column: "name", order: "asc" } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) await fail(res, "list folder");
    const rows = (await res.json()) as { name: string; id: string | null; metadata: { mimetype?: string; size?: number } | null }[];
    for (const r of rows) {
      if (r.name.startsWith(".") || r.name === "_rls_diag_delete_me") continue;
      out.push({ path: prefix ? `${prefix}/${r.name}` : r.name, name: r.name, folder: !r.id, mimetype: r.metadata?.mimetype ?? null, size: r.metadata?.size ?? null });
    }
    if (rows.length < page) break;
  }
  return out;
}

const IMAGE = /^image\/(jpeg|png|webp|gif|avif)$/;

/**
 * Every picture under a prefix, up to three folders deep, with the first
 * folder below the prefix as its set and the next as its subset. The result
 * is kept for a minute, since the library pages ask for it several times.
 */
const walked = new Map<string, { at: number; files: Promise<{ path: string; set: string | null; subset: string | null }[]> }>();
export async function listPictures(bucket: string, prefix: string): Promise<{ path: string; set: string | null; subset: string | null }[]> {
  const key = `${bucket}/${prefix}`;
  const hit = walked.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.files;
  const files = (async () => {
    const out: { path: string; set: string | null; subset: string | null }[] = [];
    const walk = async (p: string, depth: number, set: string | null, subset: string | null) => {
      const rows = await listFolder(bucket, p);
      for (const r of rows) {
        if (r.folder) {
          if (depth >= 3) continue;
          await walk(r.path, depth + 1, set ?? r.name, set ? (subset ?? r.name) : null);
        } else if (!r.mimetype || IMAGE.test(r.mimetype)) {
          if (!r.mimetype && !/\.(jpe?g|png|webp|gif|avif)$/i.test(r.name)) continue;
          out.push({ path: r.path, set, subset });
        }
      }
    };
    await walk(prefix.replace(/^\/+|\/+$/g, ""), 0, null, null);
    return out;
  })();
  walked.set(key, { at: Date.now(), files });
  files.catch(() => walked.delete(key));
  return files;
}

export function forgetPictures(bucket: string, prefix: string): void {
  walked.delete(`${bucket}/${prefix}`);
}

/** Every object under a prefix in the library bucket, removed; used when a library is deleted. */
export async function removeFolder(prefix: string): Promise<number> {
  const paths: string[] = [];
  const walk = async (p: string) => {
    for (const r of await listFolder(LIBRARY_BUCKET, p)) {
      if (r.folder) await walk(r.path);
      else paths.push(r.path);
    }
  };
  await walk(prefix);
  for (let i = 0; i < paths.length; i += 100) {
    const res = await fetch(`${base()}/object/${LIBRARY_BUCKET}`, { method: "DELETE", headers: auth({ "Content-Type": "application/json" }), body: JSON.stringify({ prefixes: paths.slice(i, i + 100) }), signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) await fail(res, "remove images");
  }
  return paths.length;
}
