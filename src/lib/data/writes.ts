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
  /** true once the Post-Ban workflow has stamped its cleanup note. */
  cleanedUp: boolean;
}

/** Read one account's current state (for old_value + guardrails). */
export async function getAccountState(profile: string): Promise<AccountState | null> {
  const res = await sbFetch(
    `accounts?select=posting_paused,is_active,status_note&geelark_profile=eq.${encodeURIComponent(profile)}`,
    { method: "GET" },
  );
  if (!res.ok) throw new Error(`Supabase read failed (HTTP ${res.status})`);
  const rows = (await res.json()) as {
    posting_paused: boolean | null;
    is_active: boolean;
    status_note: string | null;
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
