/**
 * Display names for the people who can sign in.
 *
 * The greeting used to derive a name from the email's local part, which works
 * for a first-name address and produces nonsense for anything else:
 * `takeuchiyuriet@gmail.com` came out as "Takeuchiyuriet". Personal addresses
 * are not going to follow a convention, so the map is explicit and the
 * derivation stays as the fallback for anyone not listed.
 *
 * Keyed lower-case; compared lower-case. Adding someone here is cosmetic —
 * ALLOWED_EMAILS is what actually grants access.
 */
const DISPLAY_NAMES: Record<string, string> = {
  "garreth@arborvita.io": "Garreth",
  "garrethdottin@gmail.com": "Garreth",
  "takeuchiyuriet@gmail.com": "Yurie",
  "milan@arborvita.io": "Milan",
  "czedrickjhake.cc@gmail.com": "Czed",
};

/** "takeuchiyuriet@gmail.com" -> "Yurie"; unknown addresses fall back to the
 *  first chunk of the local part, and anything empty to null. */
export function displayNameOf(email?: string): string | null {
  const key = (email ?? "").trim().toLowerCase();
  if (DISPLAY_NAMES[key]) return DISPLAY_NAMES[key];

  const first = key.split("@")[0].split(/[._+-]/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
