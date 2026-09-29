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
