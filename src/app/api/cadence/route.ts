import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import {
  actingUserEmail,
  auditLog,
  getCadenceState,
  saveCadence,
  type CadenceLaneWrite,
} from "@/lib/data/writes";

/**
 * POST /api/cadence — fleet-wide posting cadence.
 *
 * Body: { fleet: { maxPostsPerDay, minGapMinutes, windowStart, windowEnd },
 *         fillerPerWeek, glpPerWeek,
 *         lanes: [{ contentType, character, cadencePerWeek }] }
 *
 * Every value here applies to EVERY account — this is the layer the
 * per-account overrides override.
 *
 * Two arithmetic rules, enforced here and not only in the UI, because the
 * endpoint is reachable without it and a cap the scheduler can never honour is
 * a number that lies to whoever reads it back:
 *
 *   filler + GLP <= maxPostsPerDay * 7   an account cannot post more times in
 *                                        a week than it has days to post in
 *   each character's lane mix == GLP     the mix divides the weekly GLP
 *                                        allowance; a character summing to
 *                                        less quietly under-posts all week
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

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // ── Scheduler defaults ───────────────────────────────────────────────────
  const f = (body.fleet ?? {}) as Record<string, unknown>;
  const maxPostsPerDay = int(f.maxPostsPerDay, 1, MAX_POSTS_PER_DAY);
  const minGapMinutes = int(f.minGapMinutes, 0, MAX_GAP_MINUTES);
  if (maxPostsPerDay === null) {
    return NextResponse.json(
      { error: `Max posts per day must be a whole number between 1 and ${MAX_POSTS_PER_DAY}` },
      { status: 400 },
    );
  }
  if (minGapMinutes === null) {
    return NextResponse.json(
      { error: `Minimum gap must be a whole number between 0 and ${MAX_GAP_MINUTES} minutes` },
      { status: 400 },
    );
  }
  const windowStart = typeof f.windowStart === "string" ? f.windowStart : "";
  const windowEnd = typeof f.windowEnd === "string" ? f.windowEnd : "";
  if (!HHMM.test(windowStart) || !HHMM.test(windowEnd)) {
    return NextResponse.json(
      { error: "Posting window must be HH:MM in 24-hour time" },
      { status: 400 },
    );
  }
  const startMin = toMinutes(windowStart);
  const endMin = toMinutes(windowEnd);
  if (endMin <= startMin) {
    return NextResponse.json({ error: "The posting window must end after it starts" }, { status: 400 });
  }

  // A window that cannot hold the posts it is asked for guarantees a shortfall
  // every day, so it is caught here rather than discovered in tomorrow's run.
  const needed = (maxPostsPerDay - 1) * minGapMinutes;
  if (needed > endMin - startMin) {
    return NextResponse.json(
      {
        error:
          `${maxPostsPerDay} posts ${minGapMinutes} minutes apart need ` +
          `${Math.floor(needed / 60)}h ${needed % 60}m, but ${windowStart}–${windowEnd} ` +
          `is only ${Math.floor((endMin - startMin) / 60)}h ${(endMin - startMin) % 60}m`,
      },
      { status: 400 },
    );
  }

  // ── Weekly split ─────────────────────────────────────────────────────────
  const fillerPerWeek = int(body.fillerPerWeek, 0, MAX_PER_WEEK);
  const glpPerWeek = int(body.glpPerWeek, 0, MAX_PER_WEEK);
  if (fillerPerWeek === null || glpPerWeek === null) {
    return NextResponse.json(
      { error: `Filler and GLP per week must be whole numbers between 0 and ${MAX_PER_WEEK}` },
      { status: 400 },
    );
  }
  const weekBudget = maxPostsPerDay * 7;
  if (fillerPerWeek + glpPerWeek > weekBudget) {
    return NextResponse.json(
      {
        error:
          `At ${maxPostsPerDay} posts a day an account can post ${weekBudget} times a week, ` +
          `but filler + GLP comes to ${fillerPerWeek + glpPerWeek}`,
      },
      { status: 400 },
    );
  }

  // ── GLP lane mix ─────────────────────────────────────────────────────────
  const rawLanes = body.lanes;
  if (!Array.isArray(rawLanes) || rawLanes.length === 0) {
    return NextResponse.json({ error: "lanes must be a non-empty array" }, { status: 400 });
  }

  const lanes: CadenceLaneWrite[] = [];
  for (const l of rawLanes) {
    const lane = l as Record<string, unknown>;
    const cadence = int(lane.cadencePerWeek, 0, MAX_LANE_PER_WEEK);
    if (
      typeof lane.contentType !== "string" ||
      typeof lane.character !== "string" ||
      cadence === null
    ) {
      return NextResponse.json(
        {
          error: `each lane needs a content type, a character, and 0–${MAX_LANE_PER_WEEK} per week`,
        },
        { status: 400 },
      );
    }
    lanes.push({
      contentType: lane.contentType,
      character: lane.character,
      cadencePerWeek: cadence,
    });
  }

  const byCharacter = new Map<string, number>();
  for (const l of lanes) {
    byCharacter.set(l.character, (byCharacter.get(l.character) ?? 0) + l.cadencePerWeek);
  }
  const wrong = [...byCharacter.entries()].filter(([, sum]) => sum !== glpPerWeek);
  if (wrong.length) {
    return NextResponse.json(
      {
        error: wrong
          .map(([name, sum]) => `${name}'s mix adds up to ${sum}, not ${glpPerWeek}`)
          .join("; "),
      },
      { status: 400 },
    );
  }

  // The filler lane is one registry row shared by every character. It is kept
  // in step with scheduler_buckets.weekly_quota so the two never disagree —
  // the bucket is what the scheduler reads.
  lanes.push({ contentType: "filler", character: "All", cadencePerWeek: fillerPerWeek });

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

    for (const tag of [ACCOUNTS_TAG, "cadence-data", "scheduler-config", "scheduler-buckets"]) {
      revalidateTag(tag, { expire: 0 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "cadence save failed" },
      { status: 502 },
    );
  }
}
