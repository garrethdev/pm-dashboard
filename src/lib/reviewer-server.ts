import { authBypassed, isReviewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Whether the person looking is a reviewer (PF-26): on REVIEWER_EMAILS as well
 * as the allowlist. Server only. The dev bypass counts as a reviewer so the
 * Sessions page can be drawn locally; it is never honoured in production.
 */
export async function viewerIsReviewer(): Promise<boolean> {
  if (authBypassed()) return true;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isReviewer(user?.email);
}
