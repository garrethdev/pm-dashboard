/**
 * Setting up a new character from the Accounts page (Garreth, 2026-10-01).
 *
 * No database here, so the form and the route read the same rules. The
 * database function `setup_character` checks every one of them again.
 *
 * A character is "Character" and a number, and nothing else: the daily
 * planner only reads accounts whose character starts with "Character", so a
 * character called anything else would have accounts nothing ever plans for.
 *
 * The posting amounts are optional. Left out, the character gets a daily cap
 * of 0 and its accounts are given nothing. Content types are never set here
 * (Garreth, 2026-10-01): a content type belongs to one character, so a new one
 * starts with none and is given its own when they are built.
 */

/** Highest the form allows. A day of 10 is the planner's own ceiling. */
export const MAX_POSTS_PER_DAY = 10;
export const MAX_POSTS_PER_WEEK = 70;

const NAME = /^Character ([1-9]\d{0,2})$/;

/** "Character 6" after "Character 2" … "Character 5". Counts every character,
 *  switched on or not, so a retired number is never handed out again. */
export function nextCharacterName(existing: string[]): string {
  let highest = 0;
  for (const name of existing) {
    const m = NAME.exec(name.trim());
    if (m) highest = Math.max(highest, Number(m[1]));
  }
  return `Character ${highest + 1}`;
}

export interface NewCharacterFields {
  character: string;
  notes: string | null;
  /** Both null when the posting amounts were skipped. */
  maxPerDay: number | null;
  perWeek: number | null;
}

/** A whole number from a form field, or null when the field was left empty. */
function amount(raw: unknown): number | null | "bad" {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,3}$/.test(raw.trim()) ? Number(raw) : NaN;
  return Number.isInteger(n) ? n : "bad";
}

/** The two posting amounts: both given, or both left empty (none). */
function parseAmounts(
  body: Record<string, unknown>,
): { ok: true; maxPerDay: number | null; perWeek: number | null } | { ok: false; error: string } {
  const maxPerDay = amount(body.maxPerDay);
  const perWeek = amount(body.perWeek);
  if (maxPerDay === "bad" || perWeek === "bad") {
    return { ok: false, error: "Posting amounts are whole numbers." };
  }
  if ((maxPerDay === null) !== (perWeek === null)) {
    return { ok: false, error: "Give both posting amounts, or leave both empty." };
  }
  if (maxPerDay !== null && (maxPerDay < 1 || maxPerDay > MAX_POSTS_PER_DAY)) {
    return { ok: false, error: `Posts a day is between 1 and ${MAX_POSTS_PER_DAY}.` };
  }
  if (perWeek !== null && (perWeek < 1 || perWeek > MAX_POSTS_PER_WEEK)) {
    return { ok: false, error: `Posts a week is between 1 and ${MAX_POSTS_PER_WEEK}.` };
  }
  if (maxPerDay !== null && perWeek !== null && perWeek > maxPerDay * 7) {
    return {
      ok: false,
      error: `${perWeek} a week will not fit into ${maxPerDay} a day. The most is ${maxPerDay * 7}.`,
    };
  }
  return { ok: true, maxPerDay, perWeek };
}

function parseNotes(raw: unknown): { ok: true; notes: string | null } | { ok: false; error: string } {
  const notes = typeof raw === "string" ? raw.trim() : "";
  if (notes.length > 500) return { ok: false, error: "Keep the description under 500 characters." };
  return { ok: true, notes: notes === "" ? null : notes };
}

export function parseNewCharacter(
  body: Record<string, unknown>,
): { ok: true; fields: NewCharacterFields } | { ok: false; error: string } {
  const character = typeof body.character === "string" ? body.character.trim() : "";
  if (!NAME.test(character)) {
    return { ok: false, error: 'A character is named "Character" and a number, like Character 6.' };
  }
  const notes = parseNotes(body.notes);
  if (!notes.ok) return notes;
  const amounts = parseAmounts(body);
  if (!amounts.ok) return amounts;
  return {
    ok: true,
    fields: {
      character,
      notes: notes.notes,
      maxPerDay: amounts.maxPerDay,
      perWeek: amounts.perWeek,
    },
  };
}

/**
 * What Edit on the Characters sheet may change (Garreth, 2026-10-01). Only
 * the parts sent are changed: `notes` when the key is there, the amounts when
 * `maxPerDay` is there. Empty amounts mean none, as on Setup character.
 */
export interface CharacterEditFields {
  character: string;
  notes?: string | null;
  amounts?: { maxPerDay: number | null; perWeek: number | null };
}

export function parseCharacterEdit(
  body: Record<string, unknown>,
): { ok: true; fields: CharacterEditFields } | { ok: false; error: string } {
  const character = typeof body.character === "string" ? body.character.trim() : "";
  if (character === "") return { ok: false, error: "Which character?" };
  const fields: CharacterEditFields = { character };
  if (body.notes !== undefined) {
    const notes = parseNotes(body.notes);
    if (!notes.ok) return notes;
    fields.notes = notes.notes;
  }
  if (body.maxPerDay !== undefined) {
    const amounts = parseAmounts(body);
    if (!amounts.ok) return amounts;
    fields.amounts = { maxPerDay: amounts.maxPerDay, perWeek: amounts.perWeek };
  }
  return { ok: true, fields };
}

/**
 * A character's profile photo (Garreth, 2026-10-01). The browser shrinks it to
 * a 256px square JPEG before sending, so anything near the limit is a sign the
 * shrinking did not happen.
 */
export const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
/** The side of the square the browser shrinks a photo to. */
export const PHOTO_SIDE = 256;

export function photoRefusal(file: { type: string; size: number }): string | null {
  if (!(file.type in PHOTO_TYPES)) return "The photo must be a JPG, PNG or WebP image.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > PHOTO_MAX_BYTES) return "The photo is larger than 2 MB.";
  return null;
}

/** "Character 6" → "character-6", for the photo's folder. */
export function characterSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
