import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSession } from "@/lib/api-auth";
import { FLEET_COOKIE } from "@/lib/fleet";

/**
 * POST /api/fleet — remember which fleet this person is looking at.
 *
 * A view preference and nothing more: it changes no account and no schedule,
 * so there is nothing to audit. Per person, per browser.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { fleet?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (body.fleet !== "cloud" && body.fleet !== "physical") {
    return NextResponse.json({ error: "fleet must be cloud or physical" }, { status: 400 });
  }

  const store = await cookies();
  store.set(FLEET_COOKIE, body.fleet, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.json({ ok: true, fleet: body.fleet });
}
