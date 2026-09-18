import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG } from "@/lib/data/cache";
import { accountDetailTag } from "@/lib/data/account-detail";
import { requireSession } from "@/lib/api-auth";
import {
  actingUserEmail,
  auditLog,
  getAccountState,
  setDeliveryMode,
  validDeliveryMode,
  validProfile,
} from "@/lib/data/writes";

/**
 * POST /api/accounts/delivery-mode — who posts for this account (PF-01):
 * "geelark" (the robot, through a cloud phone) or "manual" (a person on a real
 * iPhone). Modelled on the pause toggle, and deliberately leaves
 * posting_paused alone.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { profile?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!validProfile(body.profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }
  if (!validDeliveryMode(body.mode)) {
    return NextResponse.json({ error: "mode must be geelark or manual" }, { status: 400 });
  }

  try {
    const userEmail = await actingUserEmail();
    const state = await getAccountState(body.profile);
    if (!state) return NextResponse.json({ error: "account not found" }, { status: 404 });
    if (!state.is_active) {
      return NextResponse.json({ error: "cannot change a retired account" }, { status: 409 });
    }
    // Nothing to do: no write, and no audit row claiming a change that was not one.
    if (state.delivery_mode === body.mode) {
      return NextResponse.json({ ok: true, profile: body.profile, mode: body.mode, changed: false });
    }

    await setDeliveryMode(body.profile, body.mode, userEmail);
    await auditLog({
      userEmail,
      action: "delivery_mode_change",
      target: body.profile,
      oldValue: { delivery_mode: state.delivery_mode },
      newValue: { delivery_mode: body.mode },
    });

    revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    // The account page has its own cache entry; without this it would keep
    // showing the old answer for up to a minute after the flip.
    revalidateTag(accountDetailTag(body.profile), { expire: 0 });
    return NextResponse.json({ ok: true, profile: body.profile, mode: body.mode, changed: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "change failed" },
      { status: 502 },
    );
  }
}
