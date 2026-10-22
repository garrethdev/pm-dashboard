import { NextResponse } from "next/server";
import { guard, requestOrigin } from "@/server/carousel/http";
import { logError } from "@/server/carousel/log";
import { startConnect } from "@/server/carousel/services/higgsfield";

/**
 * Pressing Connect in Settings lands here (DEV-30, step one). The app
 * registers itself with Higgsfield's authorization server if it has not
 * already, notes the sign-in it is starting, and sends the browser to
 * Higgsfield's sign-in page. The person picks the account there.
 */
export async function GET(req: Request) {
  const origin = requestOrigin(req);
  const g = await guard();
  if (g.denied) return NextResponse.redirect(`${origin}/login`, 303);
  try {
    const url = await startConnect(origin);
    return NextResponse.redirect(url, 303);
  } catch (err) {
    logError("higgsfield connect", err);
    const reason = err instanceof Error ? err.message : "The sign-in could not be started";
    return NextResponse.redirect(`${origin}/settings?higgsfield=error&reason=${encodeURIComponent(reason)}`, 303);
  }
}

export const dynamic = "force-dynamic";
