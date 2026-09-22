import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG } from "@/lib/data/cache";
import { accountDetailTag } from "@/lib/data/account-detail";
import { requireSession } from "@/lib/api-auth";
import {
  actingUserEmail,
  auditLog,
  getAccountState,
  setWarmupMode,
  validProfile,
  validWarmupMode,
} from "@/lib/data/writes";

/**
 * POST /api/accounts/warmup-mode — who warms this account up (PF-04):
 * "manual" (a person, and its warmups appear on the to-do list) or "script"
 * (the warmup script on the Air logs its own, PF-13).
 *
 * It takes a LIST of profiles rather than one, because the by-phone view's
 * phone-wide switch sets every account on a phone in a single press (design
 * ticket P4). One press is one request, so a phone cannot end up half flipped
 * by a browser that closed between calls.
 *
 * Modelled on the delivery-mode route, with one deliberate difference: this
 * does not touch `status_note`. It is a single press with no hold, and the
 * note is read on screen.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { profiles?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (
    !Array.isArray(body.profiles) ||
    body.profiles.length === 0 ||
    !body.profiles.every(validProfile)
  ) {
    return NextResponse.json({ error: "invalid profiles" }, { status: 400 });
  }
  if (!validWarmupMode(body.mode)) {
    return NextResponse.json({ error: "mode must be manual or script" }, { status: 400 });
  }
  const profiles = body.profiles as string[];
  const mode = body.mode;

  try {
    const userEmail = await actingUserEmail();
    const changed: string[] = [];
    const skipped: { profile: string; why: string }[] = [];

    // One at a time, and a refusal on one does not stop the rest. A phone-wide
    // press over three accounts where one has been retired should still set
    // the other two, and say which it left alone.
    for (const profile of profiles) {
      const state = await getAccountState(profile);
      if (!state) {
        skipped.push({ profile, why: "not found" });
        continue;
      }
      if (!state.is_active) {
        skipped.push({ profile, why: "retired" });
        continue;
      }
      // Nothing to do: no write, and no audit row claiming a change that was
      // not one. The phone-wide press hits this for every account already set
      // the way it is being set.
      if (state.warmup_mode === mode) continue;

      await setWarmupMode(profile, mode);
      await auditLog({
        userEmail,
        action: "warmup_mode_change",
        target: profile,
        oldValue: { warmup_mode: state.warmup_mode },
        newValue: { warmup_mode: mode },
      });
      changed.push(profile);
      revalidateTag(accountDetailTag(profile), { expire: 0 });
    }

    if (changed.length > 0) revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    return NextResponse.json({ ok: true, mode, changed, skipped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "change failed" },
      { status: 502 },
    );
  }
}
