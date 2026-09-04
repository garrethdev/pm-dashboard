/**
 * Server-side Supabase REST reads with the service-role key.
 * SECURITY: `accounts` carries live secrets (passwords, tokens) — every query
 * in this codebase must select explicit columns; never `select=*` on accounts.
 */
export async function sbRest<T>(path: string): Promise<T> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`supabase HTTP ${res.status} on ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

/** Read-only Postgres function call (POST /rpc/<fn>). Used for reporting
 *  functions like analytics_freshness_check(). `args` becomes the POST body,
 *  so named parameters are passed as { p_days: 7 }. */
export async function sbRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`supabase RPC HTTP ${res.status} on ${fn}`);
  return (await res.json()) as T;
}
