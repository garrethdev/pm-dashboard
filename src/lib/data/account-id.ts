/**
 * `accounts.id`, carried as text (PF-22).
 *
 * The column is a Postgres `bigint`, and nine real accounts have 17-digit ids
 * (Profiles 8, 9, 20, 64 and 65 among the live ones). A JavaScript number is
 * exact only up to 9,007,199,254,740,991, so reading one of those as a number
 * rounds it: 26716659041349202 arrives as 26716659041349200, an account that
 * does not exist. A warmup, a phone move or an edit written against that id
 * lands nowhere, or refuses.
 *
 * So the app never holds an account id as a number. Every read asks
 * PostgREST for the id as text, and everything after that — item ids, URLs,
 * request bodies, map keys, comparisons — keeps the string. Postgres turns the
 * text back into a bigint exactly wherever it is written or filtered on.
 *
 * Phone, step, session and delivery ids are small counters and stay numbers.
 */
export type AccountId = string;

/** `accounts.id` in a PostgREST `select=`, read as text under the same name. */
export const ACCOUNT_ID_COL = "id:id::text";

/** An `account_id` column in a PostgREST `select=`, read as text. */
export const ACCOUNT_FK_COL = "account_id:account_id::text";

/** The largest bigint, as text. */
const BIGINT_MAX = "9223372036854775807";

/**
 * An account id from a URL, a form or a request body, or null.
 *
 * Text is taken as it is, when it is a positive whole number a bigint can
 * hold. A JSON number is taken only while it is still exact: anything above
 * 2^53 − 1 has already been rounded by whoever sent it, and writing it would
 * land on the wrong account, so it is refused rather than trusted.
 */
export function parseAccountId(raw: unknown): AccountId | null {
  if (typeof raw === "number") {
    return Number.isSafeInteger(raw) && raw > 0 ? String(raw) : null;
  }
  if (typeof raw !== "string" || !/^[1-9]\d{0,18}$/.test(raw)) return null;
  // Same length compares as text the same way it compares as a number.
  if (raw.length === BIGINT_MAX.length && raw > BIGINT_MAX) return null;
  return raw;
}
