import { authBypassed, isEmailAllowed } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side write helpers for dashboard actions (plan §9). Every write is
 * audit-logged to dashboard_audit_log. Supabase has had intermittent gateway
 * latency, so writes use a timeout + one retry and fail loudly rather than
 * half-completing.
 */

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function sbFetch(path: string, init: RequestInit, retries = 1): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: { ...serviceHeaders(), ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });
      return res;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Couldn't reach Supabase — nothing was changed (${lastErr instanceof Error ? lastErr.message : "timeout"})`,
  );
}

/** The signed-in user's email (for audit + post-ban report). Dev bypass uses the first allowlist entry. */
export async function actingUserEmail(): Promise<string> {
  if (authBypassed()) {
    return (process.env.ALLOWED_EMAILS ?? "dev@local").split(",")[0]!.trim();
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isEmailAllowed(user.email)) throw new Error("unauthorized");
  return user.email;
}

export async function auditLog(entry: {
  userEmail: string;
  action: string;
  target: string;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  // Best-effort: an audit-insert failure must not roll back a completed action,
  // but we surface it in logs.
  try {
    await sbFetch("dashboard_audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_email: entry.userEmail,
        action: entry.action,
        target: entry.target,
        old_value: entry.oldValue ?? null,
        new_value: entry.newValue ?? null,
      }),
    });
  } catch (err) {
    console.error("audit-log insert failed", err);
  }
}

const PROFILE_RE = /^Profile \d+$/;
export function validProfile(p: unknown): p is string {
  return typeof p === "string" && PROFILE_RE.test(p);
}

export interface AccountState {
  posting_paused: boolean | null;
  is_active: boolean;
  status_note: string | null;
  /** "Character 3" — the outer bound on which content types may be selected. */
  character: string | null;
  /** true once the Post-Ban workflow has stamped its cleanup note. */
  cleanedUp: boolean;
}

/** Read one account's current state (for old_value + guardrails). */
export async function getAccountState(profile: string): Promise<AccountState | null> {
  const res = await sbFetch(
    `accounts?select=posting_paused,is_active,status_note,character&geelark_profile=eq.${encodeURIComponent(profile)}`,
    { method: "GET" },
  );
  if (!res.ok) throw new Error(`Supabase read failed (HTTP ${res.status})`);
  const rows = (await res.json()) as {
    posting_paused: boolean | null;
    is_active: boolean;
    status_note: string | null;
    character: string | null;
  }[];
  const row = rows[0];
  if (!row) return null;
  return { ...row, cleanedUp: /post-ban cleanup/i.test(row.status_note ?? "") };
}

/** §9.2 pause/unpause: explicit boolean only, never NULL; never touches is_active. */
export async function setPostingPaused(
  profile: string,
  paused: boolean,
  userEmail: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const noteFragment = ` | ${today} ${userEmail}: posting ${paused ? "paused" : "unpaused"} via dashboard`;

  // Append to status_note via a read-modify-write (PostgREST has no string concat).
  const cur = await sbFetch(
    `accounts?select=status_note&geelark_profile=eq.${encodeURIComponent(profile)}`,
    { method: "GET" },
  );
  const curRows = (await cur.json()) as { status_note: string | null }[];
  const newNote = (curRows[0]?.status_note ?? "") + noteFragment;

  const res = await sbFetch(`accounts?geelark_profile=eq.${encodeURIComponent(profile)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      posting_paused: paused, // explicit boolean — never NULL (plan §10.3)
      status_note: newNote,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`Pause write failed (HTTP ${res.status}) — nothing was changed`);
}

/**
 * §9.5 per-account scheduler override.
 *
 * Stored as up to three rows (bucket null / 'glp' / 'filler') that are always
 * written and cleared together — a half-written override would give the
 * scheduler a daily cap with no weekly cap, which reads as "unlimited week".
 *
 * Switching off sets active=false rather than deleting, so the numbers are
 * still there when it is switched back on.
 */
export interface SchedulerOverrideInput {
  maxPostsPerDay: number | null;
  glpWeekCap: number | null;
  fillerWeekCap: number | null;
  onlyContentTypes: string[] | null;
  bypassGuards: boolean;
  note: string | null;
}

const OVERRIDE_PATH = (profile: string) =>
  `scheduler_overrides?scope=eq.account&scope_key=eq.${encodeURIComponent(profile)}`;

/** Current override rows for an account (for audit old_value). */
export async function getSchedulerOverrideRows(profile: string): Promise<unknown[]> {
  const res = await sbFetch(
    `${OVERRIDE_PATH(profile)}&select=bucket,weekly_cap,max_posts_per_day,bypass_guards,only_content_types,active`,
    { method: "GET" },
  );
  if (!res.ok) throw new Error(`Supabase read failed (HTTP ${res.status})`);
  return (await res.json()) as unknown[];
}

export async function saveSchedulerOverride(
  profile: string,
  input: SchedulerOverrideInput,
  userEmail: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const note = input.note?.trim()
    ? `${today} ${userEmail}: ${input.note.trim()}`
    : `${today} ${userEmail}: set via dashboard`;

  // Replace rather than upsert: the unique index is on an expression
  // (coalesce(bucket,'')), which PostgREST's on_conflict cannot target.
  const del = await sbFetch(OVERRIDE_PATH(profile), {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!del.ok) throw new Error(`Override clear failed (HTTP ${del.status}) — nothing was changed`);

  // PostgREST rejects a bulk insert whose objects don't share the same keys, so
  // every row carries the full column set and nulls what doesn't apply to it.
  const row = (
    bucket: string | null,
    fields: { weekly_cap?: number | null; max_posts_per_day?: number | null },
  ) => ({
    scope: "account",
    scope_key: profile,
    bucket,
    weekly_cap: fields.weekly_cap ?? null,
    max_posts_per_day: fields.max_posts_per_day ?? null,
    bypass_guards: bucket === null ? input.bypassGuards : false,
    only_content_types: bucket === null ? input.onlyContentTypes : null,
    active: true,
    note,
  });

  const rows = [
    row(null, { max_posts_per_day: input.maxPostsPerDay }),
    row("glp", { weekly_cap: input.glpWeekCap }),
    row("filler", { weekly_cap: input.fillerWeekCap }),
  ];

  const res = await sbFetch("scheduler_overrides", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    // The delete already landed, so the account is on scheduler defaults —
    // safe, but say so rather than implying nothing happened.
    throw new Error(
      `Override save failed (HTTP ${res.status}) — ${profile} is now on scheduler defaults`,
    );
  }
}

/** Switch an override off without losing the values behind it. */
export async function setSchedulerOverrideActive(
  profile: string,
  active: boolean,
): Promise<void> {
  const res = await sbFetch(OVERRIDE_PATH(profile), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error(`Override toggle failed (HTTP ${res.status}) — nothing was changed`);
}

/** The verdicts a human may record. `confirmed` = "the system is right". */
export const HUMAN_VERDICTS = [
  "confirmed",
  "healthy",
  "watch",
  "collapsing",
  "shadowbanned",
] as const;
export type HumanVerdict = (typeof HUMAN_VERDICTS)[number];

export function validHumanVerdict(v: unknown): v is HumanVerdict {
  return typeof v === "string" && (HUMAN_VERDICTS as readonly string[]).includes(v);
}

/**
 * Record a human's read of a system health verdict.
 *
 * Append-only, and deliberately writes NOTHING to `accounts` — not
 * health_status, and above all not is_active. A review is an opinion on record,
 * not an action: retiring stays a separate, explicit decision.
 *
 * `systemVerdict` pins the review to the evidence it was made against, so a
 * later change of machine opinion marks it for re-review instead of letting a
 * months-old "looks fine" bury a fresh collapse.
 */
export async function recordHealthReview(args: {
  profile: string;
  systemVerdict: string;
  humanVerdict: HumanVerdict;
  note: string | null;
  userEmail: string;
}): Promise<void> {
  const res = await sbFetch("account_health_reviews", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      geelark_profile: args.profile,
      system_verdict: args.systemVerdict,
      human_verdict: args.humanVerdict,
      note: args.note,
      reviewed_by: args.userEmail,
    }),
  });
  if (!res.ok) {
    throw new Error(`Review not saved (HTTP ${res.status})`);
  }
}

/* ── Fleet cadence (Adjust Cadence) ─────────────────────────────────────────
 * Unlike the per-account override, everything here applies to EVERY account:
 * content_type_registry.cadence_per_week is the mix the scheduler aims for, and
 * scheduler_buckets is where each account's limits start.
 */

export interface CadenceLaneWrite {
  contentType: string;
  character: string;
  cadencePerWeek: number;
}

export interface FleetDefaultsWrite {
  maxPostsPerDay: number;
  minGapMinutes: number;
  /** "HH:MM", ET wall clock. */
  windowStart: string;
  windowEnd: string;
  glpPerWeek: number;
  fillerPerWeek: number;
}

const registryPath = (contentType: string, character: string) =>
  `content_type_registry?content_type=eq.${encodeURIComponent(contentType)}` +
  `&character=eq.${encodeURIComponent(character)}`;

/** Current registry cadence + bucket rows, for the audit old_value. */
export async function getCadenceState(): Promise<unknown> {
  const [reg, buckets] = await Promise.all([
    sbFetch(
      "content_type_registry?select=content_type,character,quota_bucket,cadence_per_week&active=is.true",
      { method: "GET" },
    ),
    sbFetch(
      "scheduler_buckets?select=bucket,quota_value,min_gap_minutes," +
        "max_posts_per_day_per_profile,time_window_start,time_window_end",
      { method: "GET" },
    ),
  ]);
  if (!reg.ok || !buckets.ok) throw new Error("Supabase read failed — nothing was changed");
  return { registry: await reg.json(), buckets: await buckets.json() };
}

/**
 * Write the cadence mix and the fleet defaults.
 *
 * Lanes are PATCHed one at a time by (content_type, character): that pair is
 * the registry's identity, and `divorce_story` (Char 2, retired) vs
 * `divorce_stories` (Char 4, active) is the reason content_type alone is not
 * enough. Both scheduler_buckets rows get the same fleet values — the account
 * config view resolves them with max(), so leaving one behind would let the
 * stale row win.
 */
export async function saveCadence(
  lanes: CadenceLaneWrite[],
  fleet: FleetDefaultsWrite,
): Promise<void> {
  for (const lane of lanes) {
    const res = await sbFetch(registryPath(lane.contentType, lane.character), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ cadence_per_week: lane.cadencePerWeek }),
    });
    if (!res.ok) {
      throw new Error(
        `Cadence write failed for ${lane.contentType} (HTTP ${res.status}) — earlier lanes were saved`,
      );
    }
  }

  const shared = {
    max_posts_per_day_per_profile: fleet.maxPostsPerDay,
    min_gap_minutes: fleet.minGapMinutes,
    time_window_start: `${fleet.windowStart}:00`,
    time_window_end: `${fleet.windowEnd}:00`,
    updated_at: new Date().toISOString(),
  };

  // weekly_quota is per bucket; everything else is the same on both rows
  // because the account-config view resolves them with max().
  for (const [bucket, weekly] of [
    ["glp", fleet.glpPerWeek],
    ["filler", fleet.fillerPerWeek],
  ] as const) {
    const res = await sbFetch(`scheduler_buckets?bucket=eq.${bucket}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ...shared, weekly_quota: weekly }),
    });
    if (!res.ok) {
      throw new Error(
        `Fleet defaults write failed for ${bucket} (HTTP ${res.status}) — the cadence mix was saved`,
      );
    }
  }
}
