import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG, DEVICES_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import { assignRefusal, parseRowId } from "@/lib/data/device-rules";
import {
  assignAccountToDevice,
  countDeviceAccounts,
  DeviceWriteError,
  getDeviceAccountState,
  getDeviceState,
  unassignAccountFromDevice,
  type DeviceAccountState,
} from "@/lib/data/device-writes";

type Ctx = { params: Promise<{ id: string }> };

/** How the audit log names an account: its profile when it has one, else its handle. */
function accountLabel(a: DeviceAccountState): string {
  return a.geelark_profile ?? `${a.platform ?? "account"}:${a.username ?? a.id}`;
}

async function readInput(request: Request, ctx: Ctx) {
  const deviceId = parseRowId((await ctx.params).id);
  let accountId: number | null = null;
  try {
    const body = (await request.json()) as { accountId?: unknown };
    accountId = parseRowId(body?.accountId);
  } catch {
    // falls through to the 400 below
  }
  return { deviceId, accountId };
}

function fail(err: unknown, fallback: string) {
  return NextResponse.json(
    { error: err instanceof Error ? err.message : fallback },
    { status: err instanceof DeviceWriteError ? err.status : 502 },
  );
}

/** POST /api/devices/[id]/accounts — put an account on this phone. At most
 *  three per phone, and never onto a phone that is switched off. */
export async function POST(request: Request, ctx: Ctx) {
  const denied = await requireSession();
  if (denied) return denied;

  const { deviceId, accountId } = await readInput(request, ctx);
  if (deviceId === null) return NextResponse.json({ error: "invalid phone" }, { status: 400 });
  if (accountId === null) return NextResponse.json({ error: "Choose an account." }, { status: 400 });

  try {
    const userEmail = await actingUserEmail();
    const [device, account] = await Promise.all([
      getDeviceState(deviceId),
      getDeviceAccountState(accountId),
    ]);
    if (!device) return NextResponse.json({ error: "That phone no longer exists." }, { status: 404 });
    if (!account) return NextResponse.json({ error: "That account no longer exists." }, { status: 404 });

    const refusal = assignRefusal({
      deviceId,
      deviceName: device.name,
      deviceActive: device.is_active,
      heldCount: await countDeviceAccounts(deviceId),
      accountActive: account.is_active,
      accountDeviceId: account.device_id,
      accountFleet: account.delivery_mode === "manual" ? "physical" : "cloud",
      accountName: account.geelark_profile,
    });
    if (refusal) return NextResponse.json({ error: refusal }, { status: 409 });

    await assignAccountToDevice(accountId, { id: deviceId, name: device.name });
    await auditLog({
      userEmail,
      action: "device_assign_account",
      target: accountLabel(account),
      oldValue: { device_id: null },
      newValue: { device_id: deviceId, device_name: device.name, account_id: accountId },
    });

    revalidateTag(DEVICES_TAG, { expire: 0 });
    revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Adding the account failed");
  }
}

/** DELETE /api/devices/[id]/accounts — take an account off this phone. */
export async function DELETE(request: Request, ctx: Ctx) {
  const denied = await requireSession();
  if (denied) return denied;

  const { deviceId, accountId } = await readInput(request, ctx);
  if (deviceId === null) return NextResponse.json({ error: "invalid phone" }, { status: 400 });
  if (accountId === null) return NextResponse.json({ error: "Choose an account." }, { status: 400 });

  try {
    const userEmail = await actingUserEmail();
    const [device, account] = await Promise.all([
      getDeviceState(deviceId),
      getDeviceAccountState(accountId),
    ]);
    if (!device) return NextResponse.json({ error: "That phone no longer exists." }, { status: 404 });
    if (!account) return NextResponse.json({ error: "That account no longer exists." }, { status: 404 });

    const removed = await unassignAccountFromDevice(accountId, deviceId);
    if (!removed) {
      return NextResponse.json(
        { error: `That account is not on ${device.name} any more. Refresh and look again.` },
        { status: 409 },
      );
    }
    await auditLog({
      userEmail,
      action: "device_unassign_account",
      target: accountLabel(account),
      oldValue: { device_id: deviceId, device_name: device.name, account_id: accountId },
      newValue: { device_id: null },
    });

    revalidateTag(DEVICES_TAG, { expire: 0 });
    revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Removing the account failed");
  }
}
