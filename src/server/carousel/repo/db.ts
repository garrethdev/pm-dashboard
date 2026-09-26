/**
 * Thin PostgREST helpers for the generator's own tables.
 *
 * `sbRest` in src/lib/data/supabase.ts is read-only by design; the generator
 * writes batches, decks and versions, so it has its own small set here. Every
 * call uses the service-role key, times out, and never caches. A failed write
 * throws with the PostgREST message so a route can say what went wrong.
 */
const TIMEOUT_MS = 12_000;

function headers(extra: Record<string, string> = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function url(path: string) {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error("SUPABASE_URL is not configured");
  return `${base}/rest/v1/${path}`;
}

async function fail(res: Response, what: string): Promise<never> {
  const text = await res.text().catch(() => "");
  let message = `HTTP ${res.status}`;
  try {
    const parsed = JSON.parse(text) as { message?: string; details?: string };
    if (parsed.message) message = parsed.message;
    if (parsed.details) message += ` (${parsed.details})`;
  } catch {
    if (text) message = text.slice(0, 300);
  }
  throw new Error(`${what}: ${message}`);
}

export async function dbGet<T>(path: string): Promise<T> {
  const res = await fetch(url(path), {
    headers: headers(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) await fail(res, `read ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

/** Read every row a page at a time (PostgREST caps a response at 1000). */
export async function dbGetAll<T>(path: string, maxRows = 20_000): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  const out: T[] = [];
  for (let offset = 0; offset < maxRows; offset += 1000) {
    const page = await dbGet<T[]>(`${path}${sep}limit=1000&offset=${offset}`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
  throw new Error(`read ${path.split("?")[0]} passed ${maxRows} rows`);
}

export async function dbInsert<T>(table: string, rows: unknown, opts: { upsert?: string } = {}): Promise<T[]> {
  const prefer = ["return=representation", opts.upsert ? "resolution=merge-duplicates" : ""].filter(Boolean).join(",");
  const path = opts.upsert ? `${table}?on_conflict=${opts.upsert}` : table;
  const res = await fetch(url(path), {
    method: "POST",
    headers: headers({ Prefer: prefer }),
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) await fail(res, `insert ${table}`);
  return (await res.json()) as T[];
}

export async function dbPatch<T>(pathWithFilter: string, patch: unknown): Promise<T[]> {
  const res = await fetch(url(pathWithFilter), {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(patch),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) await fail(res, `update ${pathWithFilter.split("?")[0]}`);
  return (await res.json()) as T[];
}

export async function dbDelete(pathWithFilter: string): Promise<void> {
  const res = await fetch(url(pathWithFilter), {
    method: "DELETE",
    headers: headers({ Prefer: "return=minimal" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) await fail(res, `delete ${pathWithFilter.split("?")[0]}`);
}

export async function dbRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(url(`rpc/${fn}`), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) await fail(res, `rpc ${fn}`);
  return (await res.json()) as T;
}

/** Whether the generator can reach the database at all. */
export function dbConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const enc = encodeURIComponent;
