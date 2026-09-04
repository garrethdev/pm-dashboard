import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import {
  actingUserEmail,
  auditLog,
  getAccountState,
  setPostingPaused,
  validProfile,
} from "@/lib/data/writes";

/** POST /api/accounts/pause — toggle posting_paused (plan §9.2). */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { profile?: unknown; paused?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!validProfile(body.profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }
  if (typeof body.paused !== "boolean") {
    return NextResponse.json({ error: "paused must be a boolean" }, { status: 400 });
  }

  try {
    const userEmail = await actingUserEmail();
    const state = await getAccountState(body.profile);
    if (!state) return NextResponse.json({ error: "account not found" }, { status: 404 });
    if (!state.is_active) {
      return NextResponse.json({ error: "cannot pause a retired account" }, { status: 409 });
    }

    await setPostingPaused(body.profile, body.paused, userEmail);
    await auditLog({
      userEmail,
      action: "pause_toggle",
      target: body.profile,
      oldValue: { posting_paused: state.posting_paused },
      newValue: { posting_paused: body.paused },
    });

    revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    return NextResponse.json({ ok: true, profile: body.profile, paused: body.paused });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "pause failed" },
      { status: 502 },
    );
  }
}
