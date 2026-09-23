import { cachedFetcher, DEVICES_TAG, TTL, type Cached } from "@/lib/data/cache";
import { sbRest } from "@/lib/data/supabase";
import { toPlatform, type Platform } from "@/lib/data/accounts";

/**
 * Physical phones (PF-02) and the accounts each one holds.
 *
 * `devices` is service-role only (RLS on, no policies), like `accounts`, so
 * these reads run server-side with the service key. Every `accounts` read here
 * names its columns: that table carries live credentials.
 */

export interface DeviceAccount {
  /** accounts.id. Used instead of the Geelark profile because a Facebook
   *  account, or one created straight onto a real phone, may not have one. */
  id: number;
  profile: string | null;
  username: string | null;
  character: string | null;
  platform: Platform;
  isActive: boolean;
  /** The account's own number (P14: numbers belong to accounts). */
  phoneNumber: string | null;
}

export interface Device {
  id: number;
  name: string;
  model: string | null;
  iosVersion: string | null;
  proxy: string | null;
  timezone: string | null;
  /** Path inside the private device-proofs bucket; never a URL. */
  proofPath: string | null;
  isActive: boolean;
  notes: string | null;
  /** One per line (P6). No longer read since P14 moved numbers onto the
   *  accounts; kept because the column is kept. */
  phoneNumbers: string | null;
  accounts: DeviceAccount[];
}

interface RawDevice {
  id: number;
  name: string;
  model: string | null;
  ios_version: string | null;
  proxy: string | null;
  timezone: string | null;
  whoer_screenshot_path: string | null;
  is_active: boolean;
  notes: string | null;
  phone_numbers: string | null;
}

interface RawDeviceAccount {
  id: number;
  geelark_profile: string | null;
  username: string | null;
  character: string | null;
  platform: string | null;
  is_active: boolean;
  device_id: number | null;
  phone_number: string | null;
}

const DEVICE_COLS =
  "id,name,model,ios_version,proxy,timezone,whoer_screenshot_path,is_active,notes,phone_numbers";
const ACCOUNT_COLS = "id,geelark_profile,username,character,platform,is_active,device_id,phone_number";

function toAccount(a: RawDeviceAccount): DeviceAccount {
  return {
    id: a.id,
    profile: a.geelark_profile,
    username: a.username,
    character: a.character,
    platform: toPlatform(a.platform),
    isActive: a.is_active,
    phoneNumber: a.phone_number,
  };
}

function toDevice(d: RawDevice, accounts: RawDeviceAccount[]): Device {
  return {
    id: d.id,
    name: d.name,
    model: d.model,
    iosVersion: d.ios_version,
    proxy: d.proxy,
    timezone: d.timezone,
    proofPath: d.whoer_screenshot_path,
    isActive: d.is_active,
    notes: d.notes,
    phoneNumbers: d.phone_numbers,
    accounts: accounts.filter((a) => a.device_id === d.id).map(toAccount),
  };
}

// Two plain reads joined here rather than a PostgREST embed: an embed depends
// on PostgREST having noticed the new foreign key, and a fleet of phones is a
// few dozen rows at most.
async function fetchDevices(): Promise<Device[]> {
  const [devices, accounts] = await Promise.all([
    // Phones in use first, then by name. `id` breaks ties so the order is stable.
    sbRest<RawDevice[]>(`devices?select=${DEVICE_COLS}&order=is_active.desc,name.asc,id.asc`),
    sbRest<RawDeviceAccount[]>(
      `accounts?select=${ACCOUNT_COLS}&device_id=not.is.null&order=platform.asc,id.asc`,
    ),
  ]);
  return devices.map((d) => toDevice(d, accounts));
}

export const getDevices = cachedFetcher("devices-list-v1", TTL.supabase, fetchDevices, {
  tags: [DEVICES_TAG],
});

/** One phone with its accounts, or null when there is no such phone. */
export function getDevice(id: number): Promise<Cached<Device | null>> {
  return cachedFetcher(
    `device-v1:${id}`,
    TTL.supabase,
    async () => {
      const [devices, accounts] = await Promise.all([
        sbRest<RawDevice[]>(`devices?select=${DEVICE_COLS}&id=eq.${id}&limit=1`),
        sbRest<RawDeviceAccount[]>(
          `accounts?select=${ACCOUNT_COLS}&device_id=eq.${id}&order=platform.asc,id.asc`,
        ),
      ]);
      return devices[0] ? toDevice(devices[0], accounts) : null;
    },
    { tags: [DEVICES_TAG] },
  )();
}

/** Live accounts that are not on any phone yet — what "Add account" offers. */
export const getAssignableAccounts = cachedFetcher(
  "devices-assignable-v1",
  TTL.supabase,
  async () => {
    const rows = await sbRest<RawDeviceAccount[]>(
      `accounts?select=${ACCOUNT_COLS}&is_active=eq.true&device_id=is.null&username=not.is.null&order=character.asc,platform.asc,id.asc`,
    );
    return rows.map(toAccount);
  },
  { tags: [DEVICES_TAG] },
);

/** The phone an account lives on, for the account page. Null while it is still on Geelark. */
export function getDeviceForProfile(
  profile: string,
): Promise<Cached<{ id: number; name: string; isActive: boolean } | null>> {
  return cachedFetcher(
    `device-for-profile-v1:${profile}`,
    TTL.supabase,
    async () => {
      const rows = await sbRest<{ device_id: number | null }[]>(
        `accounts?select=device_id&geelark_profile=eq.${encodeURIComponent(profile)}&limit=1`,
      );
      const deviceId = rows[0]?.device_id;
      if (deviceId == null) return null;
      const devices = await sbRest<{ id: number; name: string; is_active: boolean }[]>(
        `devices?select=id,name,is_active&id=eq.${deviceId}&limit=1`,
      );
      const d = devices[0];
      return d ? { id: d.id, name: d.name, isActive: d.is_active } : null;
    },
    { tags: [DEVICES_TAG] },
  )();
}

/**
 * Short-lived links to proof screenshots.
 *
 * The bucket is private because a screenshot shows the phone's proxy IP, so
 * the only way to show one is a signed link made here with the service key.
 * Never cached: a link remembered for longer than it lives is a broken image.
 * A failure returns no links rather than throwing — a missing thumbnail should
 * not take the whole Devices page down with it.
 */
export async function signProofUrls(
  paths: string[],
  expiresInSeconds = 600,
): Promise<Record<string, string>> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL;
  if (!key || !base || paths.length === 0) return {};
  try {
    const res = await fetch(`${base}/storage/v1/object/sign/device-proofs`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: expiresInSeconds, paths }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`device proof signing failed (HTTP ${res.status})`);
      return {};
    }
    const rows = (await res.json()) as { path: string; signedURL: string | null; error: string | null }[];
    const out: Record<string, string> = {};
    for (const r of rows) {
      if (r.signedURL) out[r.path] = `${base}/storage/v1${r.signedURL}`;
    }
    return out;
  } catch (err) {
    console.error("device proof signing failed", err);
    return {};
  }
}
