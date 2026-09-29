/**
 * The door for scheduled jobs. Every other generator route is for a
 * signed-in person. A schedule is not a person, so its routes are let past
 * the sign-in gate in `proxy.ts` and check a token here instead: the value
 * of CRON_SECRET, sent as `Authorization: Bearer <token>`, which is what
 * Vercel's scheduler sends by itself once that setting exists.
 *
 * Shut when the token is not configured: a missing setting must never mean
 * an open door. The same rule as the warmup script's door.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const MAINTENANCE_PREFIX = "/api/carousel-generator/maintenance/";

export function requireSchedulerToken(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "Scheduled jobs are not set up on the dashboard: CRON_SECRET is missing.", code: "not_configured" }, { status: 503 });
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!given || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Wrong or missing token.", code: "unauthorized" }, { status: 401 });
  return null;
}
