/**
 * The rules for creating an account from the app (PF-21), kept pure so they
 * can be tested without a database and shared between the route and the form.
 *
 * The one that matters most is the Profile name. Every account in this system
 * is identified by `accounts.geelark_profile` — "Profile 19" — and several
 * database views join on that string. Two accounts with the same name, or one
 * written as "Profile 07" where everything else says "Profile 7", would put
 * posts, health verdicts and analytics on the wrong account with no error
 * anywhere. So the name typed on the form is put into one shape here, the
 * route refuses a name that is taken, and the database's own unique index is
 * the backstop under both.
 *
 * Nothing in this file talks to Supabase; `account-writes.ts` does that.
 */

import { isPlatform, type Platform } from "@/lib/platform";
import type { DeliveryMode } from "@/lib/data/accounts";

/** Accepts "Profile 19", "profile  19", "Profile 019" and a bare "19". */
const PROFILE_RE = /^(?:profile\s*)?0*(\d{1,6})$/i;

/**
 * The one true spelling of a Profile name, or null when the text is not one.
 *
 * Leading zeros are dropped rather than refused: "Profile 07" and "Profile 7"
 * are the same account to a person and two different accounts to a join, and
 * the form shows the name it settled on before anything is saved.
 */
export function normaliseProfile(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const match = raw.trim().replace(/\s+/g, " ").match(PROFILE_RE);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isSafeInteger(n) || n < 1) return null;
  return `Profile ${n}`;
}

/**
 * One past the highest Profile number in use, as a whole name.
 *
 * Only a suggestion for the form's placeholder — the number is not reserved
 * and the name is still checked when it is saved.
 *
 * It counts on from the end and deliberately does NOT fill the gaps. The live
 * fleet runs from Profile 8 to Profile 78 with fourteen numbers missing, and
 * those gaps are accounts that were deleted: their posts, tasks and health
 * readings are still filed under the old name in other tables, because those
 * tables hold the name rather than a link to the row. Handing "Profile 1" to a
 * brand-new account would quietly graft a dead account's history onto it.
 */
export function nextProfileName(existing: Iterable<string | null | undefined>): string {
  let highest = 0;
  for (const name of existing) {
    const norm = normaliseProfile(name ?? "");
    if (norm) highest = Math.max(highest, Number(norm.slice("Profile ".length)));
  }
  return `Profile ${highest + 1}`;
}

/** A handle as it is stored: no leading "@", no surrounding space. */
export function normaliseUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const handle = raw.trim().replace(/^@+/, "");
  return /^[A-Za-z0-9._-]{1,60}$/.test(handle) ? handle : null;
}

/**
 * An account's own phone number as it is stored (P14: numbers belong to
 * accounts). Blank is allowed and means "none recorded"; anything else must be
 * a whole number, 10 to 15 digits, written with the usual +, spaces, dashes,
 * dots or brackets. It is kept as typed, tidied, because Proxies & numbers
 * matches it to its TextVerified rental on the last ten digits anyway.
 */
export function normalisePhoneNumber(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: "The phone number must be text." };
  const text = raw.trim().replace(/\s+/g, " ");
  if (text === "") return { ok: true, value: null };
  const digits = text.replace(/\D/g, "");
  if (!/^[+\d\s().-]+$/.test(text) || digits.length < 10 || digits.length > 15) {
    return { ok: false, error: `"${text}" is not a whole phone number.` };
  }
  return { ok: true, value: text };
}

/** What Edit account may change (P14). Every field is optional: only the ones
 *  sent are changed. */
export interface AccountEditFields {
  username?: string;
  character?: string;
  phoneNumber?: string | null;
  /** The phone it is on, or null to take it off its phone. */
  deviceId?: number | null;
}

/**
 * Read the Edit account form. The Profile name and the platform are not here
 * on purpose: every workflow finds an account by its Profile name, and an
 * account does not change platform.
 */
export function parseAccountEdit(
  body: Record<string, unknown>,
): { ok: true; fields: AccountEditFields } | { ok: false; error: string } {
  const fields: AccountEditFields = {};

  if (body.username !== undefined) {
    const username = normaliseUsername(body.username);
    if (!username) {
      return {
        ok: false,
        error: "Give the account its handle — letters, numbers, dots, dashes and underscores only.",
      };
    }
    fields.username = username;
  }

  if (body.character !== undefined) {
    const character = typeof body.character === "string" ? body.character.trim() : "";
    if (character === "") return { ok: false, error: "Choose which character this account is." };
    fields.character = character;
  }

  if (body.phoneNumber !== undefined) {
    const number = normalisePhoneNumber(body.phoneNumber);
    if (!number.ok) return number;
    fields.phoneNumber = number.value;
  }

  if (body.deviceId !== undefined) {
    const raw = body.deviceId;
    if (raw === null || raw === "") {
      fields.deviceId = null;
    } else {
      const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,15}$/.test(raw) ? Number(raw) : NaN;
      if (!Number.isSafeInteger(n) || n <= 0) return { ok: false, error: "That is not a phone." };
      fields.deviceId = n;
    }
  }

  return { ok: true, fields };
}

/** The fields a new account row is made from. */
export interface NewAccountFields {
  /** Canonical "Profile 19". */
  profile: string;
  username: string;
  character: string;
  platform: Platform;
  /** Cloud ("geelark") or Physical ("manual"). */
  deliveryMode: DeliveryMode;
  /** The phone it lives on, or null. Physical only. */
  deviceId: number | null;
  /** The day the account itself was made, which is what its age is counted
   *  from; "2026-09-22". */
  createdOn: string;
  /** Held back from the scheduler until somebody says otherwise. */
  paused: boolean;
  /** The account's own number, or null (P14). */
  phoneNumber: string | null;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time)) return false;
  // Round-trip catches "2026-02-31", which Date.parse is happy to roll over.
  return new Date(time).toISOString().slice(0, 10) === value;
}

/**
 * Read the account form.
 *
 * Every refusal is a finished sentence for the screen, because this is the
 * only place that knows which field was wrong. The character is checked
 * against the live list by the caller, not here — this file has no database.
 */
export function parseNewAccount(
  body: Record<string, unknown>,
  opts: { today: string },
): { ok: true; fields: NewAccountFields } | { ok: false; error: string } {
  const profile = normaliseProfile(body.profile);
  if (!profile) {
    return { ok: false, error: "Give the account a Profile name, like Profile 79." };
  }

  const username = normaliseUsername(body.username);
  if (!username) {
    return {
      ok: false,
      error: "Give the account its handle — letters, numbers, dots, dashes and underscores only.",
    };
  }

  const character = typeof body.character === "string" ? body.character.trim() : "";
  if (character === "") return { ok: false, error: "Choose which character this account is." };

  if (!isPlatform(body.platform)) {
    return { ok: false, error: "Choose TikTok, Instagram or Facebook." };
  }
  const platform: Platform = body.platform;

  if (body.deliveryMode !== "geelark" && body.deliveryMode !== "manual") {
    return { ok: false, error: "Choose the Cloud or the Physical fleet." };
  }
  const deliveryMode: DeliveryMode = body.deliveryMode;

  let deviceId: number | null = null;
  if (body.deviceId !== null && body.deviceId !== undefined && body.deviceId !== "") {
    const raw = body.deviceId;
    const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,15}$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isSafeInteger(n) || n <= 0) return { ok: false, error: "That is not a phone." };
    if (deliveryMode !== "manual") {
      return {
        ok: false,
        error: "Only an account on the Physical fleet lives on a phone. Move it to Physical first.",
      };
    }
    deviceId = n;
  }

  const createdOn = typeof body.createdOn === "string" ? body.createdOn.trim() : "";
  if (!validDate(createdOn)) {
    return { ok: false, error: "Give the day the account was made, like 2026-09-22." };
  }
  // A day of slack: the browser sends its own local date, which can be a day
  // ahead of the server's.
  const tomorrow = new Date(Date.parse(`${opts.today}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (createdOn > tomorrow) {
    return { ok: false, error: "The account cannot have been made in the future." };
  }
  if (createdOn < "2020-01-01") {
    return { ok: false, error: "That date is too far back to be right." };
  }

  const phoneNumber = normalisePhoneNumber(body.phoneNumber);
  if (!phoneNumber.ok) return phoneNumber;

  return {
    ok: true,
    fields: {
      phoneNumber: phoneNumber.value,
      profile,
      username,
      character,
      platform,
      deliveryMode,
      deviceId,
      createdOn,
      paused: body.paused !== false,
    },
  };
}

/** What the screen says when the name typed is already on another account. */
export function profileTakenMessage(profile: string, heldBy: string | null): string {
  return heldBy
    ? `${profile} already exists — it is ${heldBy}. Every account is identified by its Profile name, so pick a free one.`
    : `${profile} already exists. Every account is identified by its Profile name, so pick a free one.`;
}

/** What the screen says when that handle is already on that platform. */
export function usernameTakenMessage(username: string, platformLabel: string): string {
  return `${platformLabel} account @${username} is already in the list. Check the Profile it is on before adding it again.`;
}
