import type { CadenceLaneWrite } from "@/lib/data/writes";

/**
 * The rules a cadence save has to pass, as plain functions.
 *
 * Pulled out of `/api/cadence` so they can be tested without standing up a
 * request. That is not tidying for its own sake: every bug the 2026-09-09
 * external review found in cadence validation lived in exactly this logic, and
 * none of it was reachable by a test while it sat inside the route handler.
 *
 * The one idea behind all of it: **the browser is not the authority on
 * anything the database already knows.** A lane arrives from the client as a
 * content type and a number. Which character that lane belongs to is read from
 * `content_type_registry` here, not taken from the payload — see
 * `resolveLaneCharacters`.
 */

/** Highest weekly cadence a single lane may be given. */
export const MAX_LANE_PER_WEEK = 10;

/** A lane as it arrives from the browser: a content type and a number. The
 *  character is deliberately absent — the registry supplies it. */
export interface ParsedLane {
  contentType: string;
  cadencePerWeek: number;
}

function isWholeNumberInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

/**
 * Read the lanes out of a request body.
 *
 * Returns the lanes, or a message to show the user. Two things it refuses:
 *
 * - **A lane that is not a content type and a whole number.**
 * - **The same content type twice.** The registry's primary key is
 *   `content_type` alone (checked live 2026-09-10), so two entries naming the
 *   same type are two instructions for one row. Before this check they both
 *   passed the client's "does the mix add up" sum and then raced each other
 *   into the database, where `save_cadence_mix()` caught it — correctly, but
 *   as a transaction failure rather than as "you sent that lane twice".
 *
 * A `character` field on an incoming lane is ignored rather than rejected: old
 * clients still send one, and the registry is the authority either way.
 */
export function parseLanes(raw: unknown): ParsedLane[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return "lanes must be a non-empty array";

  const lanes: ParsedLane[] = [];
  const seen = new Set<string>();

  for (const l of raw) {
    const lane = l as Record<string, unknown>;
    if (
      typeof lane.contentType !== "string" ||
      !lane.contentType.trim() ||
      !isWholeNumberInRange(lane.cadencePerWeek, 0, MAX_LANE_PER_WEEK)
    ) {
      return `each lane needs a content type and a whole number from 0 to ${MAX_LANE_PER_WEEK} per week`;
    }

    const contentType = lane.contentType.trim();
    if (seen.has(contentType)) {
      return `${contentType} is in the list twice — send each content type once`;
    }
    seen.add(contentType);

    lanes.push({ contentType, cadencePerWeek: lane.cadencePerWeek });
  }

  return lanes;
}

/**
 * Attach each lane's character, read from the registry.
 *
 * This is the half the review called "validating the client against itself".
 * The route used to compare a lane's `character` against the character the
 * SAME request had named, which is a comparison a payload can always win. A
 * content type belongs to exactly one character in `content_type_registry`
 * (its primary key is `content_type`), so the answer was always available
 * server-side and never needed to be asked of the browser.
 *
 * An unknown content type is refused by name rather than passed through to the
 * database, where it would have matched no row.
 */
export function resolveLaneCharacters(
  lanes: ParsedLane[],
  registryCharacterOf: Record<string, string>,
): CadenceLaneWrite[] | string {
  const unknown = lanes.filter((l) => !registryCharacterOf[l.contentType]);
  if (unknown.length) {
    return `no such content type: ${unknown.map((l) => l.contentType).join(", ")}`;
  }
  return lanes.map((l) => ({
    contentType: l.contentType,
    character: registryCharacterOf[l.contentType]!,
    cadencePerWeek: l.cadencePerWeek,
  }));
}

/**
 * An account cannot post more times in a week than it has days to post in.
 * Returns a message when the split is impossible, or null when it is fine.
 */
export function weeklyBudgetError(
  maxPostsPerDay: number,
  glpPerWeek: number,
  fillerPerWeek: number,
): string | null {
  const weekBudget = maxPostsPerDay * 7;
  if (fillerPerWeek + glpPerWeek <= weekBudget) return null;
  return (
    `At ${maxPostsPerDay} posts a day an account can post ${weekBudget} times a week, ` +
    `but filler + GLP comes to ${fillerPerWeek + glpPerWeek}`
  );
}

/** Total weekly posts across a set of lanes. */
export function sumLanes(lanes: { cadencePerWeek: number }[]): number {
  return lanes.reduce((acc, l) => acc + l.cadencePerWeek, 0);
}

/**
 * Every character's lane mix has to add up to that character's own GLP cap —
 * not to the fleet's. Character 5 runs 7 a week against a fleet 11, and
 * measuring it against the fleet number is what made the editor refuse every
 * save for every character before 2026-09-10.
 *
 * Returns a message listing each character that does not balance, or null.
 */
export function mixBalanceError(
  lanes: CadenceLaneWrite[],
  capFor: (character: string) => number,
): string | null {
  const byCharacter = new Map<string, number>();
  for (const l of lanes) {
    byCharacter.set(l.character, (byCharacter.get(l.character) ?? 0) + l.cadencePerWeek);
  }

  const wrong = [...byCharacter.entries()]
    .map(([name, sum]) => ({ name, sum, cap: capFor(name) }))
    .filter((c) => c.sum !== c.cap);

  if (!wrong.length) return null;
  return wrong.map((c) => `${c.name}'s mix adds up to ${c.sum}, not ${c.cap}`).join("; ");
}
