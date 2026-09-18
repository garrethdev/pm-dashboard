/**
 * The rules for physical phones (PF-02), kept pure so they can be tested
 * without a database and shared between the routes and the screens.
 */

/** One character's Instagram + Facebook and another character's TikTok. The
 *  database does not enforce this; the assign route does, so the refusal can
 *  name the phone that is full. */
export const MAX_ACCOUNTS_PER_DEVICE = 3;

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
/** Matches the device-proofs bucket's allowed types; value is the file extension. */
export const PROOF_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Why an account cannot go onto a phone, as a sentence for the screen — or
 * null when it can.
 */
export function assignRefusal(args: {
  deviceId: number;
  deviceName: string;
  deviceActive: boolean;
  /** How many accounts the phone holds right now. */
  heldCount: number;
  accountActive: boolean;
  /** The phone the account is on now, if any. */
  accountDeviceId: number | null;
}): string | null {
  if (!args.deviceActive) {
    return `${args.deviceName} is switched off. Switch it back on before adding accounts.`;
  }
  if (!args.accountActive) return "That account is retired, so it cannot go on a phone.";
  if (args.accountDeviceId === args.deviceId) {
    return `That account is already on ${args.deviceName}.`;
  }
  if (args.accountDeviceId !== null) {
    return "That account is already on another phone. Remove it from that phone first.";
  }
  if (args.heldCount >= MAX_ACCOUNTS_PER_DEVICE) {
    return `${args.deviceName} already holds ${MAX_ACCOUNTS_PER_DEVICE} accounts, which is the most a phone can carry. Remove one before adding another.`;
  }
  return null;
}

/** Why a proof screenshot cannot be accepted, or null when it can. */
export function proofRefusal(file: { type: string; size: number }): string | null {
  if (!(file.type in PROOF_TYPES)) return "The screenshot must be a PNG, JPG or WebP image.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > PROOF_MAX_BYTES) return "The screenshot is larger than 5 MB.";
  return null;
}

export interface DeviceFields {
  name: string;
  model: string | null;
  iosVersion: string | null;
  proxy: string | null;
  timezone: string | null;
  notes: string | null;
}

const LIMITS: Record<keyof DeviceFields, number> = {
  name: 60,
  model: 60,
  iosVersion: 20,
  proxy: 200,
  timezone: 60,
  notes: 1000,
};

const LABELS: Record<keyof DeviceFields, string> = {
  name: "Name",
  model: "Model",
  iosVersion: "iOS version",
  proxy: "Proxy",
  timezone: "Time zone",
  notes: "Notes",
};

/**
 * Read the phone form. Only the keys present in `body` come back, so the same
 * function serves "create" (`requireName`) and a partial edit. Blank optional
 * fields become null rather than empty strings.
 */
export function parseDeviceFields(
  body: Record<string, unknown>,
  opts: { requireName: boolean },
): { ok: true; fields: Partial<DeviceFields> } | { ok: false; error: string } {
  const fields: Partial<DeviceFields> = {};
  for (const key of Object.keys(LIMITS) as (keyof DeviceFields)[]) {
    const raw = body[key];
    if (raw === undefined) continue;
    if (raw !== null && typeof raw !== "string") {
      return { ok: false, error: `${LABELS[key]} must be text.` };
    }
    const value = (raw ?? "").trim();
    if (value.length > LIMITS[key]) {
      return { ok: false, error: `${LABELS[key]} is too long (${LIMITS[key]} characters at most).` };
    }
    if (key === "name") {
      if (value === "") return { ok: false, error: "Give the phone a name." };
      fields.name = value;
    } else {
      fields[key] = value === "" ? null : value;
    }
  }
  if (opts.requireName && fields.name === undefined) {
    return { ok: false, error: "Give the phone a name." };
  }
  return { ok: true, fields };
}

/**
 * The proxy as it is safe to show in a list: host and port only. Someone may
 * paste the full IP:PORT:USERNAME:PASSWORD line, and a list is no place for
 * the last two parts.
 */
export function proxyForDisplay(proxy: string | null): string | null {
  if (!proxy) return null;
  const parts = proxy.split(":");
  return parts.length > 2 ? `${parts[0]}:${parts[1]}` : proxy;
}

/** A positive whole number from a URL segment or a JSON body, or null. */
export function parseRowId(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,15}$/.test(raw) ? Number(raw) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
