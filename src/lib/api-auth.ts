import { NextResponse } from "next/server";
import { authBypassed, isEmailAllowed } from "@/lib/auth";
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
