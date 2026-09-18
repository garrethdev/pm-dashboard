import {
  MAX_ACCOUNTS_PER_DEVICE,
  PROOF_TYPES,
  type DeviceFields,
} from "@/lib/data/device-rules";

/**
 * Server-side writes for physical phones (PF-02).
 *
 * Kept out of writes.ts on purpose — that file was being edited for PF-01 at
 * the same time. The route handlers audit-log through its exported `auditLog`;
 * the small fetch helper below is a copy of its private `sbFetch` (timeout, one
 * retry, a sentence when Supabase cannot be reached).
 */

const BUCKET = "device-proofs";

/** An error whose message is already a sentence for the screen, with the HTTP
 *  status the route should answer with. */
export class DeviceWriteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}

async function sbFetch(url: string, init: RequestInit, retries = 1): Promise<Response> {
  const key = serviceKey();
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(`${process.env.SUPABASE_URL}/${url}`, {
        ...init,
        headers: { apikey: key, Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Couldn't reach Supabase (${lastErr instanceof Error ? lastErr.message : "timeout"})`,
  );
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export interface DeviceState {
  id: number;
  name: string;
  model: string | null;
  ios_version: string | null;
  proxy: string | null;
  timezone: string | null;
  whoer_screenshot_path: string | null;
  is_active: boolean;
  notes: string | null;
}

const DEVICE_COLS = "id,name,model,ios_version,proxy,timezone,whoer_screenshot_path,is_active,notes";

/** A phone as it is right now, read live (never from the cache) before a write. */
export async function getDeviceState(id: number): Promise<DeviceState | null> {
  const res = await sbFetch(`rest/v1/devices?select=${DEVICE_COLS}&id=eq.${id}&limit=1`, {});
  if (!res.ok) throw new Error(`Couldn't read the phone (HTTP ${res.status})`);
  const rows = (await res.json()) as DeviceState[];
  return rows[0] ?? null;
}

function toColumns(fields: Partial<DeviceFields> & { isActive?: boolean }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (fields.name !== undefined) out.name = fields.name;
  if (fields.model !== undefined) out.model = fields.model;
  if (fields.iosVersion !== undefined) out.ios_version = fields.iosVersion;
  if (fields.proxy !== undefined) out.proxy = fields.proxy;
  if (fields.timezone !== undefined) out.timezone = fields.timezone;
  if (fields.notes !== undefined) out.notes = fields.notes;
  if (fields.isActive !== undefined) out.is_active = fields.isActive;
  return out;
}

/** 409 from PostgREST here can only be the unique name. */
async function failFrom(res: Response, name: string | undefined, what: string): Promise<never> {
  if (res.status === 409) {
    throw new DeviceWriteError(`A phone named "${name}" already exists. Pick a different name.`, 409);
  }
  console.error(`${what} rejected (HTTP ${res.status}):`, await res.text().catch(() => ""));
  throw new Error(`${what} failed (HTTP ${res.status}). Nothing was changed.`);
}

export async function createDevice(fields: Partial<DeviceFields>): Promise<DeviceState> {
  const res = await sbFetch(`rest/v1/devices?select=${DEVICE_COLS}`, {
    method: "POST",
    headers: { ...JSON_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify(toColumns(fields)),
    // No retry on a create: a request that timed out may still have landed, and
    // a second try would then answer "that name already exists".
  }, 0);
  if (!res.ok) await failFrom(res, fields.name, "Saving the phone");
  const rows = (await res.json()) as DeviceState[];
  if (!rows[0]) throw new Error("Saving the phone returned nothing.");
  return rows[0];
}

/** Edit a phone's details and/or switch it on or off. */
export async function updateDevice(
  id: number,
  fields: Partial<DeviceFields> & { isActive?: boolean },
): Promise<DeviceState> {
  const res = await sbFetch(`rest/v1/devices?id=eq.${id}&select=${DEVICE_COLS}`, {
    method: "PATCH",
    headers: { ...JSON_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ ...toColumns(fields), updated_at: new Date().toISOString() }),
  });
  if (!res.ok) await failFrom(res, fields.name, "Saving the phone");
  const rows = (await res.json()) as DeviceState[];
  if (!rows[0]) throw new DeviceWriteError("That phone no longer exists.", 404);
  return rows[0];
}

export function setDeviceActive(id: number, isActive: boolean): Promise<DeviceState> {
  return updateDevice(id, { isActive });
}

/**
 * Store a whoer.net screenshot for a phone and point the phone at it.
 *
 * Each upload gets a new path rather than overwriting: a signed link to the old
 * path may still be open in someone's browser, and a fresh path also means the
 * new picture can never be hidden behind a cached copy of the old one. The old
 * file is removed afterwards, best-effort.
 */
export async function uploadDeviceProof(
  device: DeviceState,
  file: File,
): Promise<{ path: string }> {
  const ext = PROOF_TYPES[file.type];
  if (!ext) throw new DeviceWriteError("The screenshot must be a PNG, JPG or WebP image.", 400);
  const path = `${device.id}/${Date.now()}.${ext}`;

  const up = await sbFetch(`storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: await file.arrayBuffer(),
  }, 0);
  if (!up.ok) {
    console.error(`proof upload rejected (HTTP ${up.status}):`, await up.text().catch(() => ""));
    throw new Error(`The screenshot did not upload (HTTP ${up.status}). Nothing was changed.`);
  }

  const res = await sbFetch(`rest/v1/devices?id=eq.${device.id}`, {
    method: "PATCH",
    headers: { ...JSON_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({ whoer_screenshot_path: path, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    // Do not leave a file nothing points at.
    await removeProofObject(path);
    throw new Error(`Saving the screenshot failed (HTTP ${res.status}). Nothing was changed.`);
  }

  if (device.whoer_screenshot_path) await removeProofObject(device.whoer_screenshot_path);
  return { path };
}

async function removeProofObject(path: string): Promise<void> {
  try {
    const res = await sbFetch(`storage/v1/object/${BUCKET}/${path}`, { method: "DELETE" });
    if (!res.ok) console.error(`could not remove old proof ${path} (HTTP ${res.status})`);
  } catch (err) {
    console.error(`could not remove old proof ${path}`, err);
  }
}

export interface DeviceAccountState {
  id: number;
  geelark_profile: string | null;
  username: string | null;
  platform: string | null;
  is_active: boolean;
  device_id: number | null;
}

// SECURITY: accounts carries credentials — explicit columns only.
const ACCOUNT_COLS = "id,geelark_profile,username,platform,is_active,device_id";

export async function getDeviceAccountState(accountId: number): Promise<DeviceAccountState | null> {
  const res = await sbFetch(`rest/v1/accounts?select=${ACCOUNT_COLS}&id=eq.${accountId}&limit=1`, {});
  if (!res.ok) throw new Error(`Couldn't read the account (HTTP ${res.status})`);
  const rows = (await res.json()) as DeviceAccountState[];
  return rows[0] ?? null;
}

/** How many accounts a phone holds right now, read live. */
export async function countDeviceAccounts(deviceId: number): Promise<number> {
  const res = await sbFetch(`rest/v1/accounts?select=id&device_id=eq.${deviceId}`, {});
  if (!res.ok) throw new Error(`Couldn't count the phone's accounts (HTTP ${res.status})`);
  return ((await res.json()) as unknown[]).length;
}

async function patchAccountDevice(
  accountId: number,
  deviceId: number | null,
  onlyIfCurrently: number | null,
): Promise<boolean> {
  // The filter on the current value makes this a compare-and-set: if someone
  // else moved the account between our read and this write, nothing matches
  // and nothing is changed.
  const guard = onlyIfCurrently === null ? "device_id=is.null" : `device_id=eq.${onlyIfCurrently}`;
  const res = await sbFetch(`rest/v1/accounts?id=eq.${accountId}&${guard}&select=id`, {
    method: "PATCH",
    headers: { ...JSON_HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ device_id: deviceId }),
  });
  if (!res.ok) throw new Error(`Saving failed (HTTP ${res.status}). Nothing was changed.`);
  return ((await res.json()) as unknown[]).length > 0;
}

/**
 * Put an account on a phone. The caller has already checked the rules with
 * `assignRefusal`; this re-counts after the write, because two people adding
 * to the same phone at the same moment would each have seen room for one more.
 */
export async function assignAccountToDevice(
  accountId: number,
  device: { id: number; name: string },
): Promise<void> {
  const changed = await patchAccountDevice(accountId, device.id, null);
  if (!changed) {
    throw new DeviceWriteError("That account was just put on a phone by someone else. Refresh and look again.", 409);
  }
  const held = await countDeviceAccounts(device.id);
  if (held > MAX_ACCOUNTS_PER_DEVICE) {
    await patchAccountDevice(accountId, null, device.id);
    throw new DeviceWriteError(
      `${device.name} already holds ${MAX_ACCOUNTS_PER_DEVICE} accounts, which is the most a phone can carry. Nothing was changed.`,
      409,
    );
  }
}

/** Take an account off a phone. False when it was not on that phone any more. */
export function unassignAccountFromDevice(accountId: number, deviceId: number): Promise<boolean> {
  return patchAccountDevice(accountId, null, deviceId);
}
