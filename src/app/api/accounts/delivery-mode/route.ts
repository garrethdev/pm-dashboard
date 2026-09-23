import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG, DEVICES_TAG } from "@/lib/data/cache";
import { accountDetailTag } from "@/lib/data/account-detail";
import { requireSession } from "@/lib/api-auth";
import { parseRowId } from "@/lib/data/device-rules";
import { getDeviceState } from "@/lib/data/device-writes";
import { moveAccountToCloud } from "@/lib/data/move-to-cloud";
import {
  actingUserEmail,
  auditLog,
  getAccountState,
  MoveConflictError,
  setDeliveryMode,
  validDeliveryMode,
  validProfile,
} from "@/lib/data/writes";

/**
 * POST /api/accounts/delivery-mode — who posts for this account (PF-01):
 * "geelark" (the robot, through a cloud phone) or "manual" (a person on a real
 * iPhone). Modelled on the pause toggle, and deliberately leaves
 * posting_paused alone.
 *
 * PF-03: a move onto a real phone names the phone (`deviceId`), and the fleet,
 * the phone and the date of the move are saved in one write. Without a phone
 * the move is refused, so an account can never land on Physical with nowhere
 * to be worked on. A move back to Cloud takes it off its phone.
 *
 * The move back to Cloud also hands back the posts the account was still
 * holding for a person to post, the way a ban does (Garreth, 2026-09-23). That
 * is one database call with its own audit row, so this route writes none for
 * it.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { profile?: unknown; mode?: unknown; deviceId?: unknown };
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

  const toPhysical = body.mode === "manual";
  const deviceId = toPhysical ? parseRowId(body.deviceId) : null;
  if (toPhysical && deviceId === null) {
    return NextResponse.json({ error: "Choose a phone first." }, { status: 400 });
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

    let deviceName: string | null = null;
    if (deviceId !== null) {
      const device = await getDeviceState(deviceId);
      if (!device) return NextResponse.json({ error: "That phone no longer exists." }, { status: 404 });
      if (!device.is_active) {
        return NextResponse.json(
          { error: `${device.name} is switched off. Switch it back on before moving accounts onto it.` },
          { status: 409 },
        );
      }
      deviceName = device.name;
    }

    let released: number | undefined;
    if (toPhysical) {
      const { movedAt } = await setDeliveryMode(body.profile, body.mode, userEmail, deviceId);
      await auditLog({
        userEmail,
        action: "delivery_mode_change",
        target: body.profile,
        oldValue: { delivery_mode: state.delivery_mode, device_id: state.device_id },
        newValue: {
          delivery_mode: body.mode,
          device_id: deviceId,
          ...(deviceName ? { device_name: deviceName } : {}),
          ...(movedAt ? { moved_to_device_at: movedAt } : {}),
        },
      });
    } else {
      ({ released } = await moveAccountToCloud(body.profile, userEmail));
    }

    revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    // The phone's page lists its accounts, on both ends of the move.
    revalidateTag(DEVICES_TAG, { expire: 0 });
    // The account page has its own cache entry; without this it would keep
    // showing the old answer for up to a minute after the flip.
    revalidateTag(accountDetailTag(body.profile), { expire: 0 });
    return NextResponse.json({
      ok: true,
      profile: body.profile,
      mode: body.mode,
      changed: true,
      ...(released !== undefined ? { released } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "change failed" },
      { status: err instanceof MoveConflictError ? 409 : 502 },
    );
  }
}
