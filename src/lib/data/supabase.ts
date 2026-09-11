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

/**
 * PostgREST's hard response cap.
 *
 * Measured live 2026-09-11: a plain `select=post_id` over `tt_post_performance`
 * (2,357 rows) came back with exactly 1000 rows, HTTP 200, no error and nothing
 * in the body to say it had been cut. That is the dangerous shape — a read that
 * outgrows this does not break, it quietly starts answering with a prefix, and
 * a total summed over a prefix is simply a wrong number on the screen.
 */
export const PGRST_MAX_ROWS = 1000;

/**
 * Read every row of a query, a page at a time.
 *
 * Use this instead of `sbRest` for anything whose row count grows with the
 * corpus — per-account post history, fleet-wide performance reads. Small,
 * naturally-bounded reads (one account's registry row, the last 20 tasks) do
 * not need it.
 *
 * Two rules for the caller:
 *
 * - **Do not put your own `limit` or `offset` in `path`.** Paging is this
 *   function's job and a second limit would fight it.
 * - **Order by something unique.** Offset paging over an unstable sort can
 *   repeat or skip a row when values tie, so the order clause needs a
 *   tiebreaker the database can never call equal (a post id, a primary key).
 *
 * Hitting `maxRows` throws rather than returning what it has. A read that has
 * grown past anything we expected is a thing to find out about, and returning
 * a silent prefix is the exact failure this function exists to prevent.
 */
export async function sbRestAll<T>(
  path: string,
  opts: { pageSize?: number; maxRows?: number } = {},
): Promise<T[]> {
  const pageSize = Math.min(opts.pageSize ?? PGRST_MAX_ROWS, PGRST_MAX_ROWS);
  const maxRows = opts.maxRows ?? 100_000;
  const sep = path.includes("?") ? "&" : "?";
  const out: T[] = [];

  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const page = await sbRest<T[]>(`${path}${sep}limit=${pageSize}&offset=${offset}`);
    out.push(...page);
    // A short page is the end of the data. A full one might not be, so go again.
    if (page.length < pageSize) return out;
  }

  throw new Error(
    `supabase read on ${path.split("?")[0]} passed ${maxRows} rows — refusing to return a partial answer`,
  );
}
