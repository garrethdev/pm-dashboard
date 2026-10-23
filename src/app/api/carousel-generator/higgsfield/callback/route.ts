import { NextResponse } from "next/server";
import { auditLog } from "@/lib/data/writes";
import { guard, requestOrigin } from "@/server/carousel/http";
import { logError } from "@/server/carousel/log";
import { finishConnect } from "@/server/carousel/services/higgsfield-mcp";

/**
 * Higgsfield sends the browser back here with a code (DEV-30, step one).
 * The code is traded for tokens, the row records who connected and when,
 * and the browser goes back to Settings with a word for the card to show.
 */
export async function GET(req: Request) {
  const origin = requestOrigin(req);
  const back = (word: string, reason?: string) => NextResponse.redirect(`${origin}/settings?higgsfield=${word}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`, 303);
  const g = await guard();
  if (g.denied) return NextResponse.redirect(`${origin}/login`, 303);
  const q = new URL(req.url).searchParams;
  const refused = q.get("error");
  if (refused) return back("error", q.get("error_description") || (refused === "access_denied" ? "The sign-in was cancelled" : refused));
  const code = q.get("code");
  const state = q.get("state");
  if (!code || !state) return back("error", "Higgsfield sent no code back");
  try {
    const row = await finishConnect(origin, code, state, g.email);
    await auditLog({ userEmail: g.email, action: "carousel.higgsfield.connect", target: "higgsfield", newValue: { account: row.account_email } });
    return back("connected");
  } catch (err) {
    logError("higgsfield callback", err);
    return back("error", err instanceof Error ? err.message : "The sign-in could not be finished");
  }
}

export const dynamic = "force-dynamic";
