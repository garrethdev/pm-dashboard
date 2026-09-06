import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSession } from "@/lib/api-auth";
import { ACCOUNTS_TAG, CALENDAR_TAG, CONTENT_TYPES_TAG } from "@/lib/data/cache";
import { getFleetDefaults } from "@/lib/data/scheduler-config";
import {
  actingUserEmail,
  auditLog,
  getRegistryLanes,
  setContentTypeLifecycle,
  type ContentTypeLifecycle,
  type RegistryLaneRow,
} from "@/lib/data/writes";

/**
 * POST /api/content-types/lifecycle — pause, retire or resume one content type.
 *
 * Body: { contentType, lifecycle, note?, cadencePerWeek?,
 *         reallocation: [{ contentType, cadencePerWeek }] }
 *
 * There is no separate "off" switch to teach the automations: the registry's
 * `active` column is already the gate the Smart Scheduler, the unified poster,
 * the Inventory Monitor and the production order all read, and a trigger
 * derives it from `lifecycle`. Pausing a lane therefore stops it everywhere the
 * moment this returns.
 *
 * The arithmetic rule, enforced here and not only in the UI because the
 * endpoint is reachable without it:
 *
 *   a character's live GLP lanes must add up to the fleet GLP weekly quota
 *
 * Taking a lane out frees its slots. If they are not handed to the remaining
 * lanes, the character silently posts fewer GLP pieces a week than the fleet
 * budget says it does — a number that lies to whoever reads it back.
 */

const LIFECYCLES: ContentTypeLifecycle[] = ["live", "paused", "retired"];

const MAX_LANE_PER_WEEK = 70;

function int(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) return null;
  return v;
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
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

  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const lifecycle = body.lifecycle as ContentTypeLifecycle;
  if (!contentType) return bad("contentType is required");
  if (!LIFECYCLES.includes(lifecycle)) return bad("lifecycle must be live, paused or retired");

  const note =
    typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  let lanes: RegistryLaneRow[];
  let fleetGlp: number;
  try {
    [lanes, { data: { glpWeek: fleetGlp } }] = await Promise.all([
      getRegistryLanes(),
      getFleetDefaults(),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Supabase read failed" },
      { status: 502 },
    );
  }

  const target = lanes.find((l) => l.content_type === contentType);
  if (!target) return bad(`${contentType} is not in the content type registry`);
  if (target.lifecycle === lifecycle) {
    return bad(`${target.display_name} is already ${lifecycle}`);
  }

  const leaving = lifecycle !== "live";

  // What the lane gets after the change. Leaving rotation zeroes it so the
  // character's mix stays readable; resuming takes an explicit number.
  const requested = leaving ? 0 : int(body.cadencePerWeek, 0, MAX_LANE_PER_WEEK);
  if (requested === null) {
    return bad(`cadencePerWeek must be a whole number between 0 and ${MAX_LANE_PER_WEEK}`);
  }
  if (
    !leaving &&
    target.cadence_ceiling_per_week !== null &&
    requested > target.cadence_ceiling_per_week
  ) {
    return bad(
      `${target.display_name} is capped at ${target.cadence_ceiling_per_week} a week`,
    );
  }

  // ── Reallocation ─────────────────────────────────────────────────────────
  const rawRealloc = Array.isArray(body.reallocation) ? body.reallocation : [];
  const reallocation: { contentType: string; cadencePerWeek: number }[] = [];
  for (const item of rawRealloc) {
    const r = item as Record<string, unknown>;
    const cadence = int(r.cadencePerWeek, 0, MAX_LANE_PER_WEEK);
    if (typeof r.contentType !== "string" || cadence === null) {
      return bad("each reallocation entry needs a contentType and a whole cadencePerWeek");
    }
    if (r.contentType === contentType) {
      return bad("the lane being changed is set by cadencePerWeek, not by reallocation");
    }
    const lane = lanes.find((l) => l.content_type === r.contentType);
    if (!lane) return bad(`${r.contentType} is not in the content type registry`);
    if (lane.character !== target.character) {
      return bad(`${lane.display_name} belongs to ${lane.character}, not ${target.character}`);
    }
    if (lane.lifecycle !== "live") {
      return bad(`${lane.display_name} is ${lane.lifecycle} — it cannot take slots`);
    }
    if (lane.cadence_ceiling_per_week !== null && cadence > lane.cadence_ceiling_per_week) {
      return bad(`${lane.display_name} is capped at ${lane.cadence_ceiling_per_week} a week`);
    }
    reallocation.push({ contentType: r.contentType, cadencePerWeek: cadence });
  }

  // ── The mix has to add up ────────────────────────────────────────────────
  // Only GLP lanes divide a character's weekly quota. Filler is one fleet-wide
  // row with its own bucket budget, so it has no mix to balance.
  if (target.quota_bucket === "glp" && target.character.startsWith("Character")) {
    const after = new Map<string, number>();
    for (const lane of lanes) {
      if (lane.character !== target.character || lane.quota_bucket !== "glp") continue;
      const live = lane.content_type === contentType ? !leaving : lane.lifecycle === "live";
      if (!live) continue;
      after.set(
        lane.content_type,
        lane.content_type === contentType ? requested : (lane.cadence_per_week ?? 0),
      );
    }
    for (const r of reallocation) after.set(r.contentType, r.cadencePerWeek);

    const sum = [...after.values()].reduce((a, b) => a + b, 0);
    if (sum !== fleetGlp) {
      if (after.size === 0) {
        return bad(
          `That would leave ${target.character} with no live content types at all, ` +
            `so its ${fleetGlp} GLP posts a week have nowhere to come from`,
        );
      }
      return bad(
        `${target.character}'s live mix would add up to ${sum} a week, not ${fleetGlp}` +
          (sum < fleetGlp
            ? ` — ${fleetGlp - sum} ${fleetGlp - sum === 1 ? "post has" : "posts have"} nowhere to go`
            : " — that is more than the weekly GLP budget"),
      );
    }
  }

  // ── Write ────────────────────────────────────────────────────────────────
  try {
    const userEmail = await actingUserEmail();
    const before = lanes.filter((l) => l.character === target.character);

    await setContentTypeLifecycle({
      contentType,
      lifecycle,
      cadencePerWeek: requested,
      // Remember what it had, so resuming can offer that number back. Kept as
      // it was on resume — the pre-pause value stays the historical record.
      cadenceBeforePause: leaving
        ? (target.cadence_per_week ?? target.cadence_before_pause)
        : target.cadence_before_pause,
      note,
      reallocation,
    });

    await auditLog({
      userEmail,
      action: `content_type_${lifecycle}`,
      target: contentType,
      oldValue: before,
      newValue: { lifecycle, cadencePerWeek: requested, reallocation, note },
    });

    for (const tag of [
      CONTENT_TYPES_TAG,
      ACCOUNTS_TAG,
      // Pausing a lane changes what is on the calendar, so its cached past days
      // have to go too — the live days are read fresh anyway.
      CALENDAR_TAG,
      "cadence-data",
      "scheduler-config",
      "scheduler-buckets",
      "inventory-data-v3",
    ]) {
      revalidateTag(tag, { expire: 0 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "content type update failed" },
      { status: 502 },
    );
  }
}
