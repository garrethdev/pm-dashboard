import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * The door for callers that are not a person: a shared token sent as
 * `Authorization: Bearer <token>`, checked against `expected` (an env value).
 *
 * Shut when the token is not configured — a missing setting must never mean
 * an open door.
 */
export function requireBearerToken(
  request: Request,
  expected: string | undefined,
  notConfigured: string,
): NextResponse | null {
  if (!expected) {
    return NextResponse.json({ error: notConfigured, code: "not_configured" }, { status: 503 });
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
