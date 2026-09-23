import { MoveConflictError, moveNoteFragment } from "@/lib/data/writes";
import { moveRefusal } from "@/lib/data/move-rules";

/**
 * Moving an account from Physical back to Cloud (PF-03), with the posts it
 * was still holding (Garreth, 2026-09-23).
 *
 * On Physical the Posting Agent hands the account's posts to a person as
 * queued deliveries. Once the account is back on Cloud nobody is posting for
 * it by hand, so those posts go back to the pool the way a ban sends them
 * back (`retire_phone_account`), and come off the to-do list. The move, the
 * release and the audit row are one database call (`move_account_to_cloud`),
 * so a move cannot land with its posts still stranded on the account.
 *
 * The other direction, onto a phone, is still `setDeliveryMode`: an account
 * on Cloud has no deliveries to release.
 */

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

export interface CloudMoveResult {
  /** Content rows handed back to the pool. */
  released: number;
  /** Queued deliveries taken off the to-do list. */
  closedDeliveries: number;
  /** The phone it came off, if it was on one. */
  phone: string | null;
}

export async function moveAccountToCloud(profile: string, userEmail: string): Promise<CloudMoveResult> {
  const key = serviceKey();
  let res: Response;
  try {
    // Sent once: a move that landed but timed out in the reply would come
    // back refused as "just moved by someone else".
    res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/move_account_to_cloud`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_profile: profile,
        p_user_email: userEmail,
        p_note: moveNoteFragment("geelark", userEmail),
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new Error(
      `Couldn't reach Supabase. Nothing was changed (${err instanceof Error ? err.message : "timeout"})`,
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const refused = moveRefusal(detail);
    if (refused) throw new MoveConflictError(`${refused}. Nothing was changed.`);
    console.error(`move to Cloud failed (HTTP ${res.status}):`, detail.slice(0, 500));
    throw new Error(`Could not change who posts (HTTP ${res.status}). Nothing was changed`);
  }
  return (await res.json()) as CloudMoveResult;
}
