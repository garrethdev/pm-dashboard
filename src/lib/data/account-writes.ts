import { PLATFORM_LABEL } from "@/lib/platform";
import {
  profileTakenMessage,
  usernameTakenMessage,
  type NewAccountFields,
} from "@/lib/data/account-rules";

/**
 * Creating an account row from the app (PF-21).
 *
 * Its own file rather than another slab on `writes.ts`, for the reason
 * `device-writes.ts` gives: that file is long, it is edited by everything, and
 * a new feature landing in it collides with whatever else is in flight. The
 * route still audit-logs through `writes.ts`'s shared `auditLog`, so this is
 * only where the account-shaped SQL lives.
 *
 * SECURITY: `accounts` carries live credentials (Google and TikTok passwords,
 * tokens, TOTP secrets). Every read here names its columns.
 */

/** An error whose message is already a sentence for the screen, with the HTTP
 *  status the route should answer with. */
export class AccountWriteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function serviceHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function sbFetch(path: string, init: RequestInit, retries = 1): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: { ...serviceHeaders(), ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Couldn't reach Supabase. Nothing was changed (${lastErr instanceof Error ? lastErr.message : "timeout"})`,
  );
}

/** The characters an account may be assigned to, read live. */
export async function getActiveCharacters(): Promise<string[]> {
  const res = await sbFetch("characters?select=character&is_active=eq.true&order=character.asc", {});
  if (!res.ok) throw new Error(`Couldn't read the character list (HTTP ${res.status})`);
  return ((await res.json()) as { character: string }[]).map((c) => c.character);
}

/**
 * Who holds this Profile name already, or null when it is free.
 *
 * Read live, never from the cache: a name taken ten seconds ago by somebody
 * else's form must still refuse.
 */
export async function profileHolder(profile: string): Promise<string | null> {
  const res = await sbFetch(
    `accounts?select=username,platform,is_active&geelark_profile=eq.${encodeURIComponent(profile)}&limit=1`,
    {},
  );
  if (!res.ok) throw new Error(`Couldn't check the Profile name (HTTP ${res.status})`);
  const row = ((await res.json()) as { username: string | null; platform: string | null; is_active: boolean }[])[0];
  if (!row) return null;
  const who = row.username ? `@${row.username}` : "an account with no handle yet";
  return row.is_active ? who : `${who}, retired`;
}

/** True when that handle is already recorded on that platform. */
export async function usernameTaken(username: string, platform: string): Promise<boolean> {
  const res = await sbFetch(
    `accounts?select=id&username=eq.${encodeURIComponent(username)}&platform=eq.${encodeURIComponent(platform)}&limit=1`,
    {},
  );
  if (!res.ok) throw new Error(`Couldn't check the handle (HTTP ${res.status})`);
  return ((await res.json()) as unknown[]).length > 0;
}

export interface CreatedAccount {
  id: number;
  geelark_profile: string;
  username: string | null;
  character: string | null;
  platform: string | null;
  delivery_mode: string;
  device_id: number | null;
  account_created_on: string | null;
  is_active: boolean;
  posting_paused: boolean;
}

const RETURNED_COLS =
  "id,geelark_profile,username,character,platform,delivery_mode,device_id," +
  "account_created_on,is_active,posting_paused";

/**
 * Write the new account row.
 *
 * No retry. A create that timed out may still have landed, and a second
 * attempt would come back "that Profile name already exists" against the row
 * this same call had just written — the same reasoning as `createDevice`.
 *
 * The two unique indexes on the table are the last word: the route checks both
 * first so it can say something useful, but between that check and this write
 * somebody else's form can land, and then it is a 409 here.
 */
export async function createAccount(
  fields: NewAccountFields,
  args: { userEmail: string; today: string },
): Promise<CreatedAccount> {
  const note =
    `${args.today} ${args.userEmail}: account added in the dashboard` +
    (fields.paused ? " (posting paused)" : "");

  const res = await sbFetch(
    `accounts?select=${RETURNED_COLS}`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        geelark_profile: fields.profile,
        username: fields.username,
        character: fields.character,
        platform: fields.platform,
        delivery_mode: fields.deliveryMode,
        device_id: fields.deviceId,
        account_created_on: fields.createdOn,
        is_active: true,
        posting_paused: fields.paused,
        // Where the row came from, in the same free-text column the
        // provisioning workflow stamps ("Provision Orchestrator", "Tokportal").
        created_via: "Dashboard",
        status_note: note,
      }),
    },
    0,
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 409) {
      // Two unique indexes can raise this, and they mean different things to
      // whoever is looking at the form.
      if (body.includes("geelark_profile")) {
        throw new AccountWriteError(profileTakenMessage(fields.profile, null), 409);
      }
      if (body.includes("username")) {
        throw new AccountWriteError(
          usernameTakenMessage(fields.username, PLATFORM_LABEL[fields.platform]),
          409,
        );
      }
      throw new AccountWriteError("That account already exists.", 409);
    }
    console.error(`account create rejected (HTTP ${res.status}):`, body);
    throw new Error(`Saving the account failed (HTTP ${res.status}). Nothing was changed.`);
  }

  const rows = (await res.json()) as CreatedAccount[];
  if (!rows[0]) throw new Error("Saving the account returned nothing.");
  return rows[0];
}

/**
 * Take a just-created account back off its phone.
 *
 * Only used when the phone turned out to be full after the write — two people
 * filling in the same phone at the same moment. The account is kept and only
 * the phone is let go, because the account is real and the phone is a detail
 * that can be set again in a second.
 */
export async function detachDevice(id: number): Promise<void> {
  try {
    const res = await sbFetch(`accounts?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ device_id: null }),
    });
    if (!res.ok) console.error(`could not take account ${id} off its phone (HTTP ${res.status})`);
  } catch (err) {
    console.error(`could not take account ${id} off its phone`, err);
  }
}
