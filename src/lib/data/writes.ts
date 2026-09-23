import { authBypassed, isEmailAllowed } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DeliveryMode, WarmupMode } from "@/lib/data/accounts";

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
    `Couldn't reach Supabase. Nothing was changed (${lastErr instanceof Error ? lastErr.message : "timeout"})`,
  );
}

/**
 * Call a settings function that applies all of its writes or none of them.
 *
 * Every multi-row settings save used to be a sequence of PostgREST calls with
 * no transaction around it, so a failure part-way through left a state nobody
 * asked for — most damagingly a completed DELETE followed by a failed INSERT,
 * which erased an account's overrides and reported it as "now on defaults".
 * PostgREST cannot span statements, so the transaction lives in the database
 * and this is how we reach it.
 *
 * A raised exception rolls the whole call back, so `friendly` can promise that
 * nothing changed without having to qualify it.
 */
async function sbRpcWrite(fn: string, args: Record<string, unknown>, friendly: string): Promise<unknown> {
  const res = await sbFetch(`rpc/${fn}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Postgres RAISEs arrive as a JSON body with a message; surface it, since
    // these functions raise sentences meant to be read.
    let why = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(detail) as { message?: string; hint?: string };
      if (parsed.message) why = parsed.message;
    } catch {
      if (detail) why = detail.slice(0, 300);
    }
    throw new Error(`${friendly}: ${why}. Nothing was changed`);
  }
  return res.json().catch(() => null);
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
  //
  // `fetch` only rejects on a network-level failure -- a 400 or a 500 from
  // PostgREST RESOLVES, and this used to treat that as success. A rejected
  // insert (bad column, RLS, expired key) therefore produced no log line at
  // all, and an action could be taken with no audit trail and nothing to say
  // so. Checking the status is the whole fix; the swallow is still deliberate.
  try {
    const res = await sbFetch("dashboard_audit_log", {
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
    if (!res.ok) {
      console.error(
        `audit-log insert rejected (HTTP ${res.status}) for ${entry.action} on ${entry.target}:`,
        await res.text().catch(() => "<no body>"),
      );
    }
  } catch (err) {
    console.error("audit-log insert failed", err);
  }
}

const PROFILE_RE = /^Profile \d+$/;
export function validProfile(p: unknown): p is string {
  return typeof p === "string" && PROFILE_RE.test(p);
}

/** Who does the posting: the Geelark robot, or a person on a real iPhone. */
export function validDeliveryMode(m: unknown): m is DeliveryMode {
  return m === "geelark" || m === "manual";
}

/** Who does the warming: a person, or the script on the Air (PF-04). */
export function validWarmupMode(m: unknown): m is WarmupMode {
  return m === "manual" || m === "script";
}

export interface AccountState {
  posting_paused: boolean | null;
  delivery_mode: DeliveryMode;
  /** Who warms it: a person, or the script (PF-04). */
  warmup_mode: WarmupMode;
  is_active: boolean;
  status_note: string | null;
  /** "Character 3" — the outer bound on which content types may be selected. */
  character: string | null;
  /** The phone it is on, if any (PF-02). */
  device_id: number | null;
  /** true once the Post-Ban workflow has stamped its cleanup note. */
  cleanedUp: boolean;
}

/** Read one account's current state (for old_value + guardrails). */
export async function getAccountState(profile: string): Promise<AccountState | null> {
  const res = await sbFetch(
    `accounts?select=posting_paused,delivery_mode,warmup_mode,is_active,status_note,character,device_id&geelark_profile=eq.${encodeURIComponent(profile)}`,
    { method: "GET" },
  );
  if (!res.ok) throw new Error(`Supabase read failed (HTTP ${res.status})`);
  const rows = (await res.json()) as {
    posting_paused: boolean | null;
    delivery_mode: string | null;
    warmup_mode: string | null;
    is_active: boolean;
    status_note: string | null;
    character: string | null;
    device_id: number | null;
  }[];
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    // Anything the column could not be (it is NOT NULL with a check) still
    // reads as the default rather than as a third state.
    delivery_mode: row.delivery_mode === "manual" ? "manual" : "geelark",
    warmup_mode: row.warmup_mode === "script" ? "script" : "manual",
    cleanedUp: /post-ban cleanup/i.test(row.status_note ?? ""),
  };
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
  if (!res.ok) throw new Error(`Pause write failed (HTTP ${res.status}). Nothing was changed`);
}

/** A move refused because the account changed underneath it. */
export class MoveConflictError extends Error {}

/**
 * PF-01 delivery mode: who posts for this account — and since PF-03, the phone
 * it goes onto. Never touches posting_paused or is_active, so moving an
 * account to a real phone cannot quietly resume or stop its schedule. Who and
 * when live in dashboard_audit_log, written by the route.
 *
 * ONE WRITE, NOT THREE. Onto a phone sets the fleet, the phone and
 * `moved_to_device_at` together; back to Cloud sets the fleet and takes it off
 * its phone. Done as separate writes, a failure between them would leave an
 * account on Physical with no phone, which is the half-move P10 exists to
 * prevent.
 *
 * `moved_to_device_at` is set on every move onto a phone and kept on the way
 * back: it is the before/after line PF-10 splits on, and the audit log holds
 * every earlier move. A move from one phone to another (Edit account) is not a
 * move off Cloud and leaves it alone.
 *
 * Guarded on the fleet it is leaving, so two people moving the same account at
 * once cannot both succeed: the second matches nothing and is told so.
 */
export async function setDeliveryMode(
  profile: string,
  mode: DeliveryMode,
  userEmail: string,
  deviceId: number | null = null,
): Promise<{ movedAt: string | null }> {
  const today = new Date().toISOString().slice(0, 10);
  const noteFragment = ` | ${today} ${userEmail}: posting moved to ${
    mode === "manual" ? "a real phone" : "Geelark"
  } via dashboard`;

  // Same read-modify-write as the pause note (PostgREST has no string concat).
  const cur = await sbFetch(
    `accounts?select=status_note&geelark_profile=eq.${encodeURIComponent(profile)}`,
    { method: "GET" },
  );
  if (!cur.ok) throw new Error(`Supabase read failed (HTTP ${cur.status}). Nothing was changed`);
  const curRows = (await cur.json()) as { status_note: string | null }[];
  const newNote = (curRows[0]?.status_note ?? "") + noteFragment;

  const now = new Date().toISOString();
  const leaving: DeliveryMode = mode === "manual" ? "geelark" : "manual";
  const res = await sbFetch(
    `accounts?geelark_profile=eq.${encodeURIComponent(profile)}&delivery_mode=eq.${leaving}&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        delivery_mode: mode,
        device_id: mode === "manual" ? deviceId : null,
        ...(mode === "manual" ? { moved_to_device_at: now } : {}),
        status_note: newNote,
        updated_at: now,
      }),
    },
    // No retry: a write that landed but timed out would come back as a
    // conflict with itself.
    0,
  );
  if (!res.ok) throw new Error(`Could not change who posts (HTTP ${res.status}). Nothing was changed`);
  if (((await res.json()) as unknown[]).length === 0) {
    throw new MoveConflictError(
      `${profile} was just moved by someone else. Refresh and look again. Nothing was changed.`,
    );
  }
  return { movedAt: mode === "manual" ? now : null };
}

/**
 * PF-04 warmup mode: who warms this account up.
 *
 * Writes that one column and nothing else. Unlike the delivery-mode flip it
 * appends NOTHING to status_note: that note is read on screen, and a switch
 * that is a single press with no hold (Garreth, 2026-09-22) is too light an
 * act to keep adding a line to it. Who and when live in dashboard_audit_log,
 * written by the route.
 */
export async function setWarmupMode(profile: string, mode: WarmupMode): Promise<void> {
  const res = await sbFetch(`accounts?geelark_profile=eq.${encodeURIComponent(profile)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ warmup_mode: mode, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    throw new Error(`Could not change who warms it up (HTTP ${res.status}). Nothing was changed`);
  }
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
  // (coalesce(bucket,'')), which PostgREST's on_conflict cannot target. The
  // replace now happens inside replace_scheduler_override(), so the clear and
  // the write are one transaction — a failed write no longer leaves the
  // account stripped back to scheduler defaults.
  //
  // Every row still carries the full column set: the function's insert reads a
  // fixed column list, and a key missing from one row would land as null.
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

  await sbRpcWrite(
    "replace_scheduler_override",
    { p_scope: "account", p_scope_key: profile, p_rows: rows },
    `Override save failed for ${profile}`,
  );
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
  if (!res.ok) throw new Error(`Override toggle failed (HTTP ${res.status}). Nothing was changed`);
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
  if (!reg.ok || !buckets.ok) throw new Error("Supabase read failed. Nothing was changed");
  return { registry: await reg.json(), buckets: await buckets.json() };
}

/**
 * Write the cadence mix and the fleet defaults.
 *
 * Lanes are PATCHed one at a time by (content_type, character). The character
 * is there as a GUARD, not as part of the key: `content_type_registry`'s
 * primary key is `content_type` alone (checked live 2026-09-10), so the type
 * already identifies the row and the character clause only makes the update
 * touch nothing if the two disagree — which is what the row-count check below
 * turns into a real error. An earlier version of this comment claimed the pair
 * was the registry's identity and cited `divorce_story` (Char 2, retired)
 * against `divorce_stories` (Char 4, active); those are two different content
 * types, so they were never evidence of anything. Do not "fix" the joins
 * elsewhere on the strength of that story.
 *
 * Both scheduler_buckets rows get the same fleet values — the account config
 * view resolves them with max(), so leaving one behind would let the stale row
 * win.
 */
export async function saveCadence(
  lanes: CadenceLaneWrite[],
  fleet: FleetDefaultsWrite,
): Promise<void> {
  // One call, one transaction. Every lane and both bucket rows land together or
  // none of them do — a mix that is half old and half new adds up to nobody's
  // allocation, and that is what a failure part-way through used to leave.
  //
  // The function also counts affected rows. A PostgREST PATCH whose filter
  // matches nothing returns a cheerful 204, so a lane sent for the wrong
  // character — the character comes from the browser — used to save nothing and
  // report success. That is now an error naming the lane.
  await sbRpcWrite(
    "save_cadence_mix",
    {
      p_lanes: lanes.map((l) => ({
        content_type: l.contentType,
        character_name: l.character,
        cadence_per_week: l.cadencePerWeek,
      })),
      p_fleet: {
        max_posts_per_day: fleet.maxPostsPerDay,
        min_gap_minutes: fleet.minGapMinutes,
        window_start: `${fleet.windowStart}:00`,
        window_end: `${fleet.windowEnd}:00`,
        glp_per_week: fleet.glpPerWeek,
        filler_per_week: fleet.fillerPerWeek,
      },
    },
    "Cadence save failed",
  );
}

/* ── Character cadence (Adjust Cadence, scoped to one character) ────────────
 * The character layer sits between the fleet defaults and the per-account
 * override. Character 5 is the first to use it: 7 GLP a week against the
 * fleet's 11, no filler at all, 1 post a day.
 *
 * The rule that makes this layer safe: a field is written ONLY when it differs
 * from inherit. An absent row means "follow the fleet", so writing all three
 * rows for every character — which is what the per-account save does — would
 * quietly sever every character from the fleet default and turn one edit into
 * four forever after. `null` here means inherit, and inherit means no row.
 */

export interface CharacterOverrideWrite {
  maxPostsPerDay: number | null;
  glpWeekCap: number | null;
  fillerWeekCap: number | null;
}

const CHARACTER_OVERRIDE_PATH = (character: string) =>
  `scheduler_overrides?scope=eq.character&scope_key=eq.${encodeURIComponent(character)}`;

/**
 * Columns on a character override row that this editor does NOT manage.
 *
 * They are read back and written out again untouched. Character 5's filler row
 * carries `daily_cap = 0` alongside its `weekly_cap = 0`, and the first version
 * of this save dropped it to null on a round-trip: rebuilding a row from only
 * the fields the form knows about silently deletes every field it does not.
 * Anything added to scheduler_overrides later is preserved by adding it here.
 *
 * The value paired with each column is what to write when the bucket has no
 * row yet. It is null for every nullable column, but `bypass_guards` is NOT
 * NULL in the table, and PostgREST rejects a bulk insert whose objects do not
 * all share the same keys — so the column cannot simply be omitted for the
 * rows that lack it. It has to be present with a legal value.
 */
const CARRIED_COLUMNS = {
  daily_cap: null,
  min_gap_minutes: null,
  spacing_minutes: null,
  window_start: null,
  window_end: null,
  bypass_guards: false,
  only_content_types: null,
} as const;

type CarriedRow = Record<string, unknown> & { bucket: string | null };

const CHARACTER_OVERRIDE_COLS = [
  "bucket",
  "weekly_cap",
  "max_posts_per_day",
  "active",
  ...Object.keys(CARRIED_COLUMNS),
].join(",");

async function readCharacterRows(character: string): Promise<CarriedRow[]> {
  const res = await sbFetch(
    `${CHARACTER_OVERRIDE_PATH(character)}&select=${CHARACTER_OVERRIDE_COLS}`,
    { method: "GET" },
  );
  if (!res.ok) throw new Error(`Supabase read failed (HTTP ${res.status})`);
  return (await res.json()) as CarriedRow[];
}

/** Current character override rows, for the audit old_value. */
export async function getCharacterOverrideState(character: string): Promise<unknown> {
  return readCharacterRows(character);
}

/**
 * Replace one character's override rows.
 *
 * Delete-then-insert, not upsert: the unique index is on an expression
 * (coalesce(bucket,'')), which PostgREST's on_conflict cannot target. Same
 * reason as saveSchedulerOverride.
 *
 * An input of all-nulls deletes every row and leaves the character inheriting
 * the fleet, which is how a field is cleared back to default.
 */
export async function saveCharacterOverride(
  character: string,
  input: CharacterOverrideWrite,
  userEmail: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const note = `${today} ${userEmail}: set via dashboard`;

  // Read before deleting so the columns this form does not manage survive.
  const existing = await readCharacterRows(character);
  const carriedFor = (bucket: string | null) => {
    const prev = existing.find((r) => r.bucket === bucket);
    const out: Record<string, unknown> = {};
    for (const [col, absent] of Object.entries(CARRIED_COLUMNS)) out[col] = prev?.[col] ?? absent;
    return out;
  };

  // Clear-and-write is one transaction inside replace_scheduler_override(), so
  // a failed write can no longer leave the character stripped back to the fleet
  // defaults with its carried columns gone.
  //
  // Every row still carries the full column set: the function's insert reads a
  // fixed column list, and a key missing from one row would land as null.
  const row = (
    bucket: string | null,
    fields: {
      weekly_cap?: number | null;
      max_posts_per_day?: number | null;
      daily_cap?: number | null;
    },
  ) => ({
    scope: "character",
    scope_key: character,
    bucket,
    weekly_cap: fields.weekly_cap ?? null,
    max_posts_per_day: fields.max_posts_per_day ?? null,
    ...carriedFor(bucket),
    // After the carried columns so an explicit daily_cap wins over the stored
    // one; undefined leaves whatever carriedFor put there.
    ...(fields.daily_cap === undefined ? {} : { daily_cap: fields.daily_cap }),
    active: true,
    note,
  });

  // A bucket gets a row when the form overrides it, and ALSO when it only
  // carries settings this form does not manage — dropping those would be the
  // same silent deletion the carried columns exist to prevent.
  const keeps = (bucket: string | null) =>
    Object.keys(CARRIED_COLUMNS).some((col) => {
      const v = existing.find((r) => r.bucket === bucket)?.[col];
      return v !== null && v !== undefined && v !== false;
    });

  /** As `keeps`, but for filler, where the daily cap is resolved separately
   *  above and must not re-justify a row on its own once it has been cleared. */
  const keepsFiller = (resolvedDaily: number | null | undefined) =>
    Object.keys(CARRIED_COLUMNS).some((col) => {
      const v =
        col === "daily_cap"
          ? (resolvedDaily ?? null)
          : existing.find((r) => r.bucket === "filler")?.[col];
      return v !== null && v !== undefined && v !== false;
    });

  const rows: ReturnType<typeof row>[] = [];
  if (input.maxPostsPerDay !== null || keeps(null)) {
    rows.push(row(null, { max_posts_per_day: input.maxPostsPerDay }));
  }
  if (input.glpWeekCap !== null || keeps("glp")) rows.push(row("glp", { weekly_cap: input.glpWeekCap }));

  // Filler's weekly and daily caps have to move together.
  //
  // A weekly cap of 0 means "this character has no filler lane", and the daily
  // cap is a SEPARATE column with its own fallback chain
  // (account -> character -> fleet). Leaving it empty let it fall back to the
  // fleet's 2, so the limits table showed room for two filler posts a day on a
  // character allowed none for the week.
  //
  // The reverse matters just as much, and is how this first went wrong: on the
  // way back to inherit, a daily 0 left behind by a previous save was treated
  // as a value worth carrying, and Character 4 ended up with a weekly cap of 3
  // (inherited) against a daily cap of 0 — no filler at all, from a character
  // that was supposed to be back on the fleet defaults. So a daily 0 is dropped
  // whenever the weekly cap is not also 0: that pairing is incoherent, and the
  // only thing that ever writes it is the line above. A daily cap set by hand
  // to something other than 0 is still carried through untouched.
  const carriedFillerDaily = existing.find((r) => r.bucket === "filler")?.daily_cap ?? null;
  const fillerDaily =
    input.fillerWeekCap === 0 ? 0 : carriedFillerDaily === 0 ? null : undefined;
  if (input.fillerWeekCap !== null || fillerDaily === 0 || keepsFiller(fillerDaily)) {
    rows.push(row("filler", { weekly_cap: input.fillerWeekCap, daily_cap: fillerDaily }));
  }

  // Everything inherited: an EMPTY rows array is the correct call, not an early
  // return. It used to be one — the DELETE had already run by this point, so
  // returning here left the character on the fleet defaults, which was the
  // intent. Now that the clear happens inside the function, returning early
  // would skip it and leave the old override rows standing.
  await sbRpcWrite(
    "replace_scheduler_override",
    { p_scope: "character", p_scope_key: character, p_rows: rows },
    `Character override write failed for ${character}`,
  );
}

/** Write one character's GLP lane mix. The fleet buckets are left alone —
 *  passing a null fleet is what tells the function to skip them. */
export async function saveCharacterLanes(lanes: CadenceLaneWrite[]): Promise<void> {
  await sbRpcWrite(
    "save_cadence_mix",
    {
      p_lanes: lanes.map((l) => ({
        content_type: l.contentType,
        character_name: l.character,
        cadence_per_week: l.cadencePerWeek,
      })),
      p_fleet: null,
    },
    "Cadence save failed",
  );
}

/* ── Content type lifecycle ────────────────────────────────────────────────── */

export type ContentTypeLifecycle = "live" | "paused" | "retired";

export interface RegistryLaneRow {
  content_type: string;
  character: string;
  quota_bucket: string | null;
  cadence_per_week: number | null;
  cadence_ceiling_per_week: number | null;
  cadence_before_pause: number | null;
  lifecycle: ContentTypeLifecycle;
  display_name: string;
}

const LANE_COLUMNS =
  "content_type,character,quota_bucket,cadence_per_week,cadence_ceiling_per_week," +
  "cadence_before_pause,lifecycle,display_name";

/** Every registry lane, whatever its lifecycle — the caller needs the paused
 *  and retired ones to validate a resume and to write the audit old_value. */
export async function getRegistryLanes(): Promise<RegistryLaneRow[]> {
  const res = await sbFetch(`content_type_registry?select=${LANE_COLUMNS}`, { method: "GET" });
  if (!res.ok) throw new Error("Supabase read failed. Nothing was changed");
  return (await res.json()) as RegistryLaneRow[];
}

export interface LifecycleWrite {
  contentType: string;
  /** Whose `allowed_content_types` list this lane belongs to. */
  character: string;
  lifecycle: ContentTypeLifecycle;
  /** The target lane's allocation after the change (0 when leaving rotation). */
  cadencePerWeek: number;
  /** Remembered so a later resume can offer back what the lane used to have. */
  cadenceBeforePause: number | null;
  note: string | null;
  /** The other lanes of the same character, with their new allocations. */
  reallocation: { contentType: string; cadencePerWeek: number }[];
}

/*
 * `characters.allowed_content_types` is maintained by
 * set_content_type_lifecycle(), not from here.
 *
 * That array is the gate the Inventory Monitor reads: it computes demand only
 * for types listed against the character. A retired lane left in the array goes
 * on producing shortfalls for content nobody will post; a resumed lane missing
 * from it is invisible to inventory while the scheduler happily posts it. Which
 * is exactly why it now moves in the same transaction as the lifecycle flip
 * rather than in a separate read-modify-write either side of it.
 *
 * It is `characters`, never `accounts`. `accounts.allowed_content_types` also
 * exists and looks like the right column, but nothing reads it — the inventory
 * views take the array from `characters` via `accounts_with_content_types`.
 */


/**
 * Flip one content type's lifecycle and rebalance its character's mix.
 *
 * The target is written LAST. Every automation gates on `active`, which the
 * lifecycle trigger derives, so writing the target first would leave a window —
 * seconds, but the Smart Scheduler runs on a cron and the poster runs every few
 * minutes — where the lane is off and its slots have not yet been handed to
 * anyone. Rebalancing first means the worst case is a brief over-allocation,
 * which the daily cap absorbs, rather than an under-post.
 *
 * The character's `allowed_content_types` follows the same rule — widen first,
 * narrow last. Resuming adds the type before the lane goes live, so inventory
 * can already see it; retiring removes the type after the lane is off, so
 * demand is never computed for something already switched off. Either way a
 * half-completed run fails into the same harmless state: an array entry for a
 * lane that isn't live, which every consumer ignores.
 *
 * A pause leaves the array alone. It is meant to be temporary, and `active`
 * already stops every automation, so churning the list would add drift for
 * nothing.
 */
export async function setContentTypeLifecycle(write: LifecycleWrite): Promise<void> {
  // `filler` and `podcast` are fleet-wide: they carry character "All", which has
  // no row in `characters` and is listed against every character instead. Their
  // arrays are not this endpoint's to rewrite — the same test the Content Types
  // page uses to decide which lanes belong to a character's mix.
  const perCharacter = write.character.startsWith("Character");

  // One transaction: the rebalance, the target lane and the character's
  // allowed list all land together.
  //
  // This used to be a careful sequence — target written LAST, allowed list
  // widened before and narrowed after — because every automation gates on
  // `active`, which the lifecycle trigger derives, and writing in the wrong
  // order left a window where a lane was off and its slots had not been handed
  // on. That reasoning is now moot: inside a transaction there is no window,
  // and nothing outside ever sees a partly applied change. The ordering is kept
  // inside the function only because it still reads well.
  await sbRpcWrite(
    "set_content_type_lifecycle",
    {
      p_content_type: write.contentType,
      p_character: write.character,
      p_lifecycle: write.lifecycle,
      p_cadence_per_week: write.cadencePerWeek,
      p_cadence_before_pause: write.cadenceBeforePause,
      p_note: write.note,
      p_reallocation: write.reallocation.map((l) => ({
        content_type: l.contentType,
        cadence_per_week: l.cadencePerWeek,
      })),
      p_manage_allowed: perCharacter,
    },
    `${write.contentType} could not be set to ${write.lifecycle}`,
  );
}

