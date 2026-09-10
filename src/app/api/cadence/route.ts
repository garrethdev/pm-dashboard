import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import {
  fetchCharacterOverrides,
  NO_OVERRIDE,
  resolveCharacterCaps,
  type CharacterOverride,
} from "@/lib/data/cadence";
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
 *     lanes: [{ contentType, character, cadencePerWeek }] }
 *   Writes scheduler_buckets and every character's lane mix.
 *
 * Character (`character: "Character 5"`):
 *   { character, maxPostsPerDay, glpPerWeek, fillerPerWeek,
 *     lanes: [{ contentType, character, cadencePerWeek }] }
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

const MAX_LANE_PER_WEEK = 10;
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

/** Shared by both scopes: every lane needs a type, a character and a number. */
function parseLanes(raw: unknown): CadenceLaneWrite[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return "lanes must be a non-empty array";
  const lanes: CadenceLaneWrite[] = [];
  for (const l of raw) {
    const lane = l as Record<string, unknown>;
    const cadence = int(lane.cadencePerWeek, 0, MAX_LANE_PER_WEEK);
    if (
      typeof lane.contentType !== "string" ||
      typeof lane.character !== "string" ||
      cadence === null
    ) {
      return `each lane needs a content type, a character, and 0–${MAX_LANE_PER_WEEK} per week`;
    }
    lanes.push({
      contentType: lane.contentType,
      character: lane.character,
      cadencePerWeek: cadence,
    });
  }
  return lanes;
}

function revalidateCadence() {
  for (const tag of [ACCOUNTS_TAG, "cadence-data", "scheduler-config", "scheduler-buckets"]) {
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

  const parsed = parseLanes(body.lanes);
  if (typeof parsed === "string") return bad(parsed);
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

  const weekBudget = effective.maxPostsPerDay * 7;
  if (effective.fillerWeek + effective.glpWeek > weekBudget) {
    return bad(
      `At ${effective.maxPostsPerDay} posts a day an account can post ${weekBudget} times a week, ` +
        `but filler + GLP comes to ${effective.fillerWeek + effective.glpWeek}`,
    );
  }

  const sum = parsed.reduce((acc, l) => acc + l.cadencePerWeek, 0);
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
  const weekBudget = maxPostsPerDay * 7;
  if (fillerPerWeek + glpPerWeek > weekBudget) {
    return bad(
      `At ${maxPostsPerDay} posts a day an account can post ${weekBudget} times a week, ` +
        `but filler + GLP comes to ${fillerPerWeek + glpPerWeek}`,
    );
  }

  // ── GLP lane mix ─────────────────────────────────────────────────────────
  const parsed = parseLanes(body.lanes);
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

  const byCharacter = new Map<string, number>();
  for (const l of parsed) {
    byCharacter.set(l.character, (byCharacter.get(l.character) ?? 0) + l.cadencePerWeek);
  }
  const wrong = [...byCharacter.entries()]
    .map(([name, sum]) => ({
      name,
      sum,
      cap: (overrides[name] ?? NO_OVERRIDE).glpWeekCap ?? glpPerWeek,
    }))
    .filter((c) => c.sum !== c.cap);
  if (wrong.length) {
    return bad(wrong.map((c) => `${c.name}'s mix adds up to ${c.sum}, not ${c.cap}`).join("; "));
  }

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
