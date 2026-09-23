/**
 * The rules for physical phones (PF-02), kept pure so they can be tested
 * without a database and shared between the routes and the screens.
 */

import type { Fleet } from "@/lib/fleet";

/**
 * How many accounts a phone is EXPECTED to carry today — not a limit.
 *
 * Three is the current arrangement: one character's Instagram and Facebook and
 * another character's TikTok. It used to be enforced, and a fourth account was
 * refused outright. Garreth removed that on 2026-09-22: "do not limit the
 * number of accounts in one phone to 3. For now, we will only have 3 accounts
 * per phone but in the future there will be more in one phone."
 *
 * So nothing refuses on this number any more. It survives as the number the
 * screens count against, and as the number the batch move fills a phone to
 * before it starts on the next — which is what keeps a character's accounts
 * together. Put five on a phone and the app will let you, and say it holds
 * five.
 */
export const ACCOUNTS_PER_PHONE = 3;

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
  /** How many accounts the phone holds right now. Kept on the signature
   *  although nothing refuses on it: the callers already count, and a future
   *  cap would land here rather than anywhere new. */
  heldCount?: number;
  accountActive: boolean;
  /** The phone the account is on now, if any. */
  accountDeviceId: number | null;
  /** Which side the account is on. Only a Physical account goes on a phone
   *  here (Garreth, 2026-09-23). */
  accountFleet: Fleet;
  /** How the refusal names the account, e.g. "Profile 8". */
  accountName?: string | null;
}): string | null {
  if (!args.deviceActive) {
    return `${args.deviceName} is switched off. Switch it back on before adding accounts.`;
  }
  if (!args.accountActive) return "That account is retired, so it cannot go on a phone.";
  // A Cloud account reaches a phone only through Settings (PF-03, PF-15),
  // which moves it to Physical, puts it on the phone and dates the move in one
  // save. Putting it on a phone from here would set the phone and leave it on
  // Cloud, posting through the robot while listed on a real phone — the
  // half-move PF-03 exists to prevent (Garreth, 2026-09-23).
  if (args.accountFleet !== "physical") {
    return `${args.accountName ?? "That account"} is on the Cloud side. Move it onto a phone from Settings.`;
  }
  if (args.accountDeviceId === args.deviceId) {
    return `That account is already on ${args.deviceName}.`;
  }
  if (args.accountDeviceId !== null) {
    return "That account is already on another phone. Remove it from that phone first.";
  }
  // No refusal on how many the phone already holds (Garreth, 2026-09-22) —
  // see ACCOUNTS_PER_PHONE. A phone that is switched off, a retired account and
  // an account already on a phone are still refused; those are mistakes, not
  // arrangements.
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
  /** One per line (P6). Checked and tidied by `parsePhoneNumbers`. */
  phoneNumbers: string | null;
}

const LIMITS: Record<keyof DeviceFields, number> = {
  name: 60,
  model: 60,
  iosVersion: 20,
  proxy: 200,
  timezone: 60,
  notes: 1000,
  phoneNumbers: 500,
};

const LABELS: Record<keyof DeviceFields, string> = {
  name: "Name",
  model: "Model",
  iosVersion: "iOS version",
  proxy: "Proxy",
  timezone: "Time zone",
  notes: "Notes",
  phoneNumbers: "Phone numbers",
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
    } else if (key === "phoneNumbers") {
      const numbers = parsePhoneNumbers(value);
      const bad = numbers.find((n) => n.replace(/\D/g, "").length < 10);
      if (bad) return { ok: false, error: `"${bad}" is not a whole phone number.` };
      // Stored one per line, however they were typed or pasted.
      fields.phoneNumbers = numbers.length ? numbers.join("\n") : null;
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
 * The numbers recorded on a phone (P6), from the text the form holds. One per
 * line, but a pasted list separated by commas or semicolons reads the same.
 */
export function parsePhoneNumbers(text: string | null): string[] {
  return (text ?? "")
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter(Boolean);
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
