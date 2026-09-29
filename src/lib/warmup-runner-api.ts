import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { parseAccountId } from "@/lib/data/account-id";
import { RunnerError, type RunKey } from "@/lib/data/warmup-runs";

/**
 * The door for the warmup script on the Air (PF-13).
 *
 * Every other /api route is for a signed-in person on the allowlist. The
 * script is not a person and has no session, so these routes are let past the
 * sign-in gate in `proxy.ts` and check a token here instead: the value of
 * WARMUP_RUNNER_TOKEN, sent as `Authorization: Bearer <token>`.
 *
 * Shut when the token is not configured — a missing setting must never mean
 * an open door.
 */
export const RUNNER_API_PREFIX = "/api/warmup-runner/";

export function requireRunnerToken(request: Request): NextResponse | null {
  const expected = process.env.WARMUP_RUNNER_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "The warmup script's access is not set up on the dashboard.", code: "not_configured" },
      { status: 503 },
    );
  }
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // Compared as hashes of equal length, in constant time, so neither the
  // length nor the content of the token leaks through how long a refusal took.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!given || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Wrong or missing token.", code: "unauthorized" }, { status: 401 });
  }
  return null;
}

/** A JSON body, or null when there is none or it is not an object. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function invalid(message: string): never {
  throw new RunnerError(message, 400, "invalid_body");
}

/** An instant from the request, normalised so it matches the stored one exactly. */
export function parseInstant(raw: unknown, name: string): string {
  if (typeof raw !== "string") invalid(`${name} is missing.`);
  const t = Date.parse(raw);
  if (Number.isNaN(t)) invalid(`${name} is not a date and time.`);
  return new Date(t).toISOString();
}

/** A phone id, as text. Small numbers are accepted too. */
export function parseDeviceId(raw: unknown): string {
  if (typeof raw === "number" && Number.isSafeInteger(raw) && raw > 0) return String(raw);
  if (typeof raw === "string" && /^[1-9]\d{0,18}$/.test(raw)) return raw;
  invalid("deviceId is missing or not a phone id.");
}

/**
 * The three fields that name a run. The start must be recent: a run that
 * claims to have started days ago, or in the future, is a clock or a bug on
 * the Air, not a warmup.
 */
export function parseRunKey(body: Record<string, unknown>, now = new Date()): RunKey {
  const accountId = parseAccountId(body.accountId);
  if (accountId === null) invalid("accountId is missing, or was sent as a number too big to be exact. Send it as text.");
  if (body.sessionNo !== 1 && body.sessionNo !== 2) invalid("sessionNo must be 1 or 2.");
  const startedAt = parseInstant(body.startedAt, "startedAt");
  const t = Date.parse(startedAt);
  if (t > now.getTime() + 5 * 60_000 || t < now.getTime() - 36 * 3_600_000) {
    invalid("startedAt is more than 36 hours ago or in the future. Check the Air's clock.");
  }
  return { accountId, sessionNo: body.sessionNo, startedAt };
}

/** A note from the script: short text or nothing. */
export function parseNote(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") invalid("note must be text.");
  const note = raw.trim();
  if (note.length > 500) invalid("note is longer than 500 characters.");
  return note || null;
}

/** Turn anything thrown into the answer the script gets. */
export function runnerFailure(err: unknown): NextResponse {
  if (err instanceof RunnerError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Something went wrong.", code: "upstream" },
    { status: 502 },
  );
}
