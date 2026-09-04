import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for data reads/writes against story-finder.
 * SERVER ONLY — never import from client components. The service-role key
 * must never reach the browser (plan §1 hard rule).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    // TODO: live credential — SUPABASE_SERVICE_ROLE_KEY not set yet.
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createSupabaseClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
