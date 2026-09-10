import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { getContentTypeOptions, readEffectiveFor } from "@/lib/data/scheduler-overrides";
import {
  actingUserEmail,
  auditLog,
  getAccountState,
  getSchedulerOverrideRows,
  saveSchedulerOverride,
  setSchedulerOverrideActive,
  validProfile,
} from "@/lib/data/writes";

/**
 * POST /api/accounts/scheduler-override — per-account Smart Scheduler override.
 *
 * Body: { profile, enabled, maxPostsPerDay?, glpWeekCap?, fillerWeekCap?,
 *         onlyContentTypes?, bypassGuards?, note? }
 *
 * enabled=false switches an existing override off (values are kept).
 */

/** Caps are per account per day/week — anything past these is a typo, not intent. */
const MAX_PER_DAY = 12;
const MAX_PER_WEEK = 70;

function validCap(v: unknown, max: number): v is number | null {
  if (v === null || v === undefined) return true;
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
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

  const profile = body.profile;
  if (!validProfile(profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  try {
    const userEmail = await actingUserEmail();
    const state = await getAccountState(profile);
    if (!state) return NextResponse.json({ error: "account not found" }, { status: 404 });
    if (!state.is_active) {
      return NextResponse.json(
        { error: "cannot set a schedule for a retired account" },
        { status: 409 },
      );
    }

    const before = await getSchedulerOverrideRows(profile);

    if (!body.enabled) {
      await setSchedulerOverrideActive(profile, false);
      await auditLog({
        userEmail,
        action: "scheduler_override_off",
        target: profile,
        oldValue: before,
        newValue: { active: false },
      });
      revalidateTag(ACCOUNTS_TAG, { expire: 0 });
      return NextResponse.json({ ok: true, profile, enabled: false });
    }

    if (!validCap(body.maxPostsPerDay, MAX_PER_DAY)) {
      return NextResponse.json(
        { error: `Posts per day must be a whole number between 0 and ${MAX_PER_DAY}` },
        { status: 400 },
      );
    }
    for (const [field, label] of [
      ["glpWeekCap", "GLP per week"],
      ["fillerWeekCap", "Filler per week"],
    ] as const) {
      if (!validCap(body[field], MAX_PER_WEEK)) {
        return NextResponse.json(
          { error: `${label} must be a whole number between 0 and ${MAX_PER_WEEK}` },
          { status: 400 },
        );
      }
    }

    // A week cannot hold more posts than (posts/day x 7). The UI bounds the
    // steppers, but the rule belongs here too - the endpoint is reachable
    // without it, and a weekly cap the scheduler can never reach is a number
    // that lies to whoever reads it back.
    //
    // A BLANK weekly field means "inherit", not zero. It used to be read as
    // `?? 0`, which made the check unreachable for exactly the case that hits
    // it in practice: leave GLP and filler alone, drop posts/day to 1, and the
    // sum looked like 0 against a ceiling of 7 and saved happily - leaving the
    // account told to post 14 times into 7 slots. Every field resolves through
    // the same effective config the modal shows as its placeholder, so the
    // error names the numbers actually on screen.
    const eff = await readEffectiveFor(profile).catch(() => null);
    const dayForWeek = (body.maxPostsPerDay as number | null | undefined) ?? eff?.maxPostsPerDay ?? null;
    const glpForWeek = (body.glpWeekCap as number | null | undefined) ?? eff?.glpWeekCap ?? null;
    const fillerForWeek =
      (body.fillerWeekCap as number | null | undefined) ?? eff?.fillerWeekCap ?? null;
    if (dayForWeek !== null && (glpForWeek !== null || fillerForWeek !== null)) {
      const weekCeiling = dayForWeek * 7;
      const wk = (glpForWeek ?? 0) + (fillerForWeek ?? 0);
      if (wk > weekCeiling) {
        const inherited = [
          body.glpWeekCap === null || body.glpWeekCap === undefined ? `GLP ${glpForWeek}` : null,
          body.fillerWeekCap === null || body.fillerWeekCap === undefined
            ? `filler ${fillerForWeek}`
            : null,
        ].filter(Boolean);
        return NextResponse.json(
          {
            error:
              `At ${dayForWeek} posts/day this account can post at most ${weekCeiling} times a week. ` +
              `GLP + filler come to ${wk}` +
              (inherited.length ? ` (${inherited.join(" and ")} inherited from the defaults)` : "") +
              `. Raise posts/day, or set GLP and filler explicitly.`,
          },
          { status: 400 },
        );
      }
    }

    // Content types may only ever narrow within the character's own list.
    // Anything else would let an override route another character's content
    // to this account — the one thing this feature must not do.
    let onlyContentTypes: string[] | null = null;
    const raw = body.onlyContentTypes;
    if (Array.isArray(raw) && raw.length > 0) {
      const optionsByCharacter = (await getContentTypeOptions()).data;
      const allowed = new Set(
        (optionsByCharacter[state.character ?? ""] ?? []).map((o) => o.contentType),
      );
      if (allowed.size === 0) {
        return NextResponse.json(
          { error: "this account's character has no content types configured" },
          { status: 409 },
        );
      }
      const bad = raw.filter((t) => typeof t !== "string" || !allowed.has(t));
      if (bad.length) {
        return NextResponse.json(
          { error: `not allowed for ${state.character}: ${bad.join(", ")}` },
          { status: 400 },
        );
      }
      // All of them selected is the same as no restriction — store null so the
      // scheduler takes its normal path instead of re-deriving the full list.
      onlyContentTypes = raw.length === allowed.size ? null : (raw as string[]);
    }

    const input = {
      maxPostsPerDay: (body.maxPostsPerDay ?? null) as number | null,
      glpWeekCap: (body.glpWeekCap ?? null) as number | null,
      fillerWeekCap: (body.fillerWeekCap ?? null) as number | null,
      onlyContentTypes,
      bypassGuards: body.bypassGuards === true,
      note: typeof body.note === "string" ? body.note : null,
    };

    await saveSchedulerOverride(profile, input, userEmail);
    await auditLog({
      userEmail,
      action: "scheduler_override_set",
      target: profile,
      oldValue: before,
      newValue: input,
    });

    revalidateTag(ACCOUNTS_TAG, { expire: 0 });

    // Tell the caller what the scheduler will ACTUALLY do. The age ramp and the
    // health throttle can clamp a daily cap below what was asked for, and a
    // silent clamp is the worst outcome here: the pill would show a number the
    // scheduler never honours. Weekly caps are not clamped, so only the daily
    // one can come back different.
    const resolved = await readEffectiveFor(profile).catch(() => null);
    const clamped =
      resolved && input.maxPostsPerDay != null && resolved.maxPostsPerDay < input.maxPostsPerDay
        ? {
            requested: input.maxPostsPerDay,
            effective: resolved.maxPostsPerDay,
            reason: resolved.throttleReason,
          }
        : null;

    return NextResponse.json({ ok: true, profile, enabled: true, clamped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "override failed" },
      { status: 502 },
    );
  }
}
