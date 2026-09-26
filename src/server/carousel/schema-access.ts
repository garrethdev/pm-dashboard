/** Read-only transport probe, NOT a substitute for catalog SQL / RLS inspection.
 * limit=0 avoids reading application rows. An inaccessible relation may exist;
 * callers must not turn an error into permission to create a duplicate table. */
export const GENERATION_RELATIONS = ["carousel_briefs", "carousel_drafts", "carousel_draft_slides", "content_batches", "content_type_registry"] as const;
export async function probeGenerationAccess(fetcher: typeof fetch = fetch) {
  const raw = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw || !key) return { configured: false as const, checks: [], schemaVerified: false as const };
  let base: URL;
  try {
    base = new URL(raw);
    if (base.protocol !== "https:" || base.username || base.password || base.pathname !== "/" || base.search || base.hash) throw new Error();
  } catch { throw new Error("Invalid Supabase configuration"); }
  const checks = await Promise.all(GENERATION_RELATIONS.map(async relation => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetcher(new URL(`/rest/v1/${relation}?select=*&limit=0`, base), {
        method: "GET", cache: "no-store", redirect: "error", signal: controller.signal,
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
      });
      // Do not return service bodies: errors can contain implementation details.
      if (!response.ok) return { relation, access: "unverified" as const, httpStatus: response.status };
      const rows: unknown = await response.json();
      return { relation, access: Array.isArray(rows) && rows.length === 0 ? "reachable" as const : "unexpected_response" as const, httpStatus: response.status };
    } catch { return { relation, access: "unverified" as const, httpStatus: null }; }
    finally { clearTimeout(timer); }
  }));
  return { configured: true as const, checks, schemaVerified: false as const };
}
