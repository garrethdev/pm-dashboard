import { NextResponse } from "next/server";
import { authBypassed, isEmailAllowed, isReviewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Session gate for every /api/* route. Returns null when the caller is an
 * allowlisted, signed-in user; otherwise a 401 response to return as-is.
 */
export async function requireSession(): Promise<NextResponse | null> {
  if (authBypassed()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * The reviewer gate (PF-26). A signed-in, allowlisted person who is not on
 * REVIEWER_EMAILS gets 404, not 403: the Sessions page and its routes must
 * read as "nothing here" to anyone else, not as a locked door.
 */
export async function requireReviewer(): Promise<NextResponse | null> {
  if (authBypassed()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isEmailAllowed(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isReviewer(user.email)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return null;
}
