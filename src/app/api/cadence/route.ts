import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG, CADENCE_TAG, CONTENT_TYPES_TAG, INVENTORY_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import {
  fetchCharacterOverrides,
  fetchLaneCharacters,
  NO_OVERRIDE,
  resolveCharacterCaps,
  type CharacterOverride,
} from "@/lib/data/cadence";
import {
  mixBalanceError,
  parseLanes,
  resolveLaneCharacters,
  sumLanes,
  weeklyBudgetError,
} from "@/lib/data/cadence-rules";
import { getFleetDefaults } from "@/lib/data/scheduler-config";
import {
  actingUserEmail,
  auditLog,
  getCadenceState,
  getCharacterOverrideState,
  saveCadence,
  saveCharacterLanes,
  saveCharacterOverride,
  type CadenceLaneWrite,
} from "@/lib/data/writes";

/**
 * POST /api/cadence — posting cadence, at one of two scopes.
 *
 * Fleet (no `character` in the body):
 *   { fleet: { maxPostsPerDay, minGapMinutes, windowStart, windowEnd },
 *     fillerPerWeek, glpPerWeek,
 *     lanes: [{ contentType, cadencePerWeek }] }
 *   Writes scheduler_buckets and every character's lane mix.
 *
 * Character (`character: "Character 5"`):
 *   { character, maxPostsPerDay, glpPerWeek, fillerPerWeek,
 *     lanes: [{ contentType, cadencePerWeek }] }
 *   Each of the three numbers may be null, meaning "inherit the fleet". Writes
 *   scheduler_overrides at character scope plus that character's lanes, and
 *   never touches scheduler_buckets or another character.
 *
 * Two arithmetic rules, enforced here and not only in the UI, because the
 * endpoint is reachable without it and a cap the scheduler can never honour is
 * a number that lies to whoever reads it back:
 *
 *   filler + GLP <= maxPostsPerDay * 7   an account cannot post more times in
 *                                        a week than it has days to post in
 *   each character's lane mix == its own  the mix divides that character's
 *   GLP cap                               weekly allowance. This used to be
 *                                         compared against the single fleet
 *                                         number, which meant Character 5 (7 a
 *                                         week, fleet 11) could never validate
 *                                         and the editor refused every save,
 *                                         for every character.
 */

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const MAX_PER_WEEK = 70;
const MAX_POSTS_PER_DAY = 12;
const MAX_GAP_MINUTES = 720;

function int(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) return null;
  return v;
}

/** null and absent both mean "inherit"; anything else must be a valid integer.
 *  Returns `undefined` for a value that is present but not usable. */
function intOrInherit(v: unknown, min: number, max: number): number | null | undefined {
  if (v === null || v === undefined) return null;
  return int(v, min, max) ?? undefined;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Read the lanes, then ask the REGISTRY who owns each one.
 *
 * Both halves of the review's #6 live here. The parse refuses a duplicated
 * content type before the database has to; the resolve reads each lane's
 * character out of `content_type_registry` instead of believing the browser.
 * Returns a message for the user, or the lanes ready to write.
 */
async function lanesFromBody(raw: unknown): Promise<CadenceLaneWrite[] | string> {
  const parsed = parseLanes(raw);
  if (typeof parsed === "string") return parsed;

  let registry: Record<string, string>;
  try {
    registry = await fetchLaneCharacters();
  } catch {
    return "Could not read the content type registry";
  }

  return resolveLaneCharacters(parsed, registry);
}

/**
 * Everything a cadence change moves.
 *
 * The last two are the review's #5: changing a lane's weekly number changes
 * what the Content Types cards say that lane is set to, and changes the demand
 * side of Demand/Supply, since production targets are derived from the mix.
 * Neither was being expired, so both pages kept showing the old allocation for
 * up to a minute after a save that had already gone through.
 */
function revalidateCadence() {
  for (const tag of [
    ACCOUNTS_TAG,
    CONTENT_TYPES_TAG,
    INVENTORY_TAG,
    CADENCE_TAG,
    "scheduler-config",
    "scheduler-buckets",
  ]) {
    revalidateTag(tag, { expire: 0 });
  }
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("invalid body");
  }

  const character =
    typeof body.character === "string" && body.character.trim() ? body.character.trim() : null;

  return character ? saveForCharacter(body, character) : saveForFleet(body);
}

/* ── character scope ──────────────────────────────────────────────────────── */

async function saveForCharacter(body: Record<string, unknown>, character: string) {
  const maxPostsPerDay = intOrInherit(body.maxPostsPerDay, 1, MAX_POSTS_PER_DAY);
  const glpPerWeek = intOrInherit(body.glpPerWeek, 0, MAX_PER_WEEK);
  const fillerPerWeek = intOrInherit(body.fillerPerWeek, 0, MAX_PER_WEEK);

  if (maxPostsPerDay === undefined) {
    return bad(`Max posts per day must be blank, or a whole number between 1 and ${MAX_POSTS_PER_DAY}`);
  }
  if (glpPerWeek === undefined || fillerPerWeek === undefined) {
    return bad(`Filler and GLP per week must be blank, or whole numbers between 0 and ${MAX_PER_WEEK}`);
  }

  const parsed = await lanesFromBody(body.lanes);
  if (typeof parsed === "string") return bad(parsed);
  // A real check now. `l.character` came out of the registry a moment ago, so
  // this compares the request against the database rather than against another
  // field of the same request.
  const foreign = parsed.find((l) => l.character !== character);
  if (foreign) {
    return bad(`lane ${foreign.contentType} belongs to ${foreign.character}, not ${character}`);
  }

  let fleet;
  try {
    ({ data: fleet } = await getFleetDefaults());
  } catch {
    return NextResponse.json({ error: "Could not read the fleet defaults" }, { status: 502 });
  }

  // What this character will actually run on once saved.
  const effective = resolveCharacterCaps(
    { maxPostsPerDay, glpWeekCap: glpPerWeek, fillerWeekCap: fillerPerWeek },
    { maxPostsPerDay: fleet.maxPostsPerDay, glpWeek: fleet.glpWeek, fillerWeek: fleet.fillerWeek },
  );

  const budgetError = weeklyBudgetError(
    effective.maxPostsPerDay,
    effective.glpWeek,
    effective.fillerWeek,
  );
  if (budgetError) return bad(budgetError);

  const sum = sumLanes(parsed);
  if (sum !== effective.glpWeek) {
    return bad(`${character}'s mix adds up to ${sum}, not ${effective.glpWeek}`);
  }

  try {
    const userEmail = await actingUserEmail();
    const before = await getCharacterOverrideState(character);

    await saveCharacterOverride(
      character,
      { maxPostsPerDay, glpWeekCap: glpPerWeek, fillerWeekCap: fillerPerWeek },
      userEmail,
    );
    await saveCharacterLanes(parsed);

    await auditLog({
      userEmail,
      action: "character_cadence_set",
      target: character,
      oldValue: before,
      newValue: { maxPostsPerDay, glpPerWeek, fillerPerWeek, lanes: parsed },
    });

    revalidateCadence();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "cadence save failed" },
      { status: 502 },
    );
  }
}

/* ── fleet scope ──────────────────────────────────────────────────────────── */

async function saveForFleet(body: Record<string, unknown>) {
  // ── Scheduler defaults ───────────────────────────────────────────────────
  const f = (body.fleet ?? {}) as Record<string, unknown>;
  const maxPostsPerDay = int(f.maxPostsPerDay, 1, MAX_POSTS_PER_DAY);
  const minGapMinutes = int(f.minGapMinutes, 0, MAX_GAP_MINUTES);
  if (maxPostsPerDay === null) {
    return bad(`Max posts per day must be a whole number between 1 and ${MAX_POSTS_PER_DAY}`);
  }
  if (minGapMinutes === null) {
    return bad(`Minimum gap must be a whole number between 0 and ${MAX_GAP_MINUTES} minutes`);
  }
  const windowStart = typeof f.windowStart === "string" ? f.windowStart : "";
  const windowEnd = typeof f.windowEnd === "string" ? f.windowEnd : "";
  if (!HHMM.test(windowStart) || !HHMM.test(windowEnd)) {
    return bad("Posting window must be HH:MM in 24-hour time");
  }
  const startMin = toMinutes(windowStart);
  const endMin = toMinutes(windowEnd);
  if (endMin <= startMin) return bad("The posting window must end after it starts");

  // A window that cannot hold the posts it is asked for guarantees a shortfall
  // every day, so it is caught here rather than discovered in tomorrow's run.
  const needed = (maxPostsPerDay - 1) * minGapMinutes;
  if (needed > endMin - startMin) {
    return bad(
      `${maxPostsPerDay} posts ${minGapMinutes} minutes apart need ` +
        `${Math.floor(needed / 60)}h ${needed % 60}m, but ${windowStart}–${windowEnd} ` +
        `is only ${Math.floor((endMin - startMin) / 60)}h ${(endMin - startMin) % 60}m`,
    );
  }

  // ── Weekly split ─────────────────────────────────────────────────────────
  const fillerPerWeek = int(body.fillerPerWeek, 0, MAX_PER_WEEK);
  const glpPerWeek = int(body.glpPerWeek, 0, MAX_PER_WEEK);
  if (fillerPerWeek === null || glpPerWeek === null) {
    return bad(`Filler and GLP per week must be whole numbers between 0 and ${MAX_PER_WEEK}`);
  }
  const budgetError = weeklyBudgetError(maxPostsPerDay, glpPerWeek, fillerPerWeek);
  if (budgetError) return bad(budgetError);

  // GLP lane mix. Lanes carry the character the REGISTRY gives them, so a
  // payload cannot move a lane between characters to make its sums work.
  const parsed = await lanesFromBody(body.lanes);
  if (typeof parsed === "string") return bad(parsed);

  // A character that overrides its GLP cap is measured against ITS number, not
  // the fleet's. Read server-side: the client is not the authority on which
  // characters sit off the default.
  let overrides: Record<string, CharacterOverride>;
  try {
    overrides = await fetchCharacterOverrides();
  } catch {
    return NextResponse.json({ error: "Could not read the character overrides" }, { status: 502 });
  }

  const mixError = mixBalanceError(
    parsed,
    (name) => (overrides[name] ?? NO_OVERRIDE).glpWeekCap ?? glpPerWeek,
  );
  if (mixError) return bad(mixError);

  // The filler lane is one registry row shared by every character. It is kept
  // in step with scheduler_buckets.weekly_quota so the two never disagree —
  // the bucket is what the scheduler reads.
  const lanes = [...parsed, { contentType: "filler", character: "All", cadencePerWeek: fillerPerWeek }];

  try {
    const userEmail = await actingUserEmail();
    const before = await getCadenceState();

    const fleet = {
      maxPostsPerDay,
      minGapMinutes,
      windowStart,
      windowEnd,
      glpPerWeek,
      fillerPerWeek,
    };
    await saveCadence(lanes, fleet);

    await auditLog({
      userEmail,
      action: "cadence_set",
      target: "fleet",
      oldValue: before,
      newValue: { lanes, fleet },
    });

    revalidateCadence();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "cadence save failed" },
      { status: 502 },
    );
  }
}
