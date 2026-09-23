import { NextResponse } from "next/server";

/**
 * Any /api address no real route answers: a plain JSON 404.
 *
 * The page catch-all (`app/(dashboard)/[...missing]`) answers unknown PAGE
 * addresses with the app's not-found screen, and it streams, so its status is
 * 200. Without this file it caught /api addresses too, and a mistyped or
 * removed API address "succeeded" with an HTML page (P13 follow-up,
 * 2026-09-23). n8n, the Python renderer and scripts call these addresses, so
 * a wrong one has to fail loudly. Real routes always win over a catch-all.
 *
 * No session check and no database: it says "not found" and nothing else.
 */
function notFound() {
  return NextResponse.json({ error: "not found" }, { status: 404 });
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = notFound;

export function HEAD() {
  return new NextResponse(null, { status: 404, headers: { "content-type": "application/json" } });
}
