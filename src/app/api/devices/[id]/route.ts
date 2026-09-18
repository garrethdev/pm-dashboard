import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { DEVICES_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import { parseDeviceFields, parseRowId } from "@/lib/data/device-rules";
import { DeviceWriteError, getDeviceState, updateDevice } from "@/lib/data/device-writes";

/** The proxy line may carry a password, and the audit log is read more widely
 *  than the devices table, so it records that the proxy changed, not its value. */
function forAudit(state: Record<string, unknown>): Record<string, unknown> {
  return "proxy" in state ? { ...state, proxy: state.proxy ? "(set)" : null } : state;
}

/** PATCH /api/devices/[id] — edit a phone's details, or switch it on or off. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const id = parseRowId((await params).id);
  if (id === null) return NextResponse.json({ error: "invalid phone" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object") throw new Error("not an object");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = parseDeviceFields(body, { requireName: false });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }
  const isActive = body.isActive as boolean | undefined;
  if (Object.keys(parsed.fields).length === 0 && isActive === undefined) {
    return NextResponse.json({ error: "nothing to change" }, { status: 400 });
  }

  try {
    const userEmail = await actingUserEmail();
    const before = await getDeviceState(id);
    if (!before) return NextResponse.json({ error: "That phone no longer exists." }, { status: 404 });

    const after = await updateDevice(id, { ...parsed.fields, isActive });

    // A switch on/off is its own action in the log so it can be found without
    // reading every edit; when both arrive together, both rows are written.
    const detailsChanged = Object.keys(parsed.fields).length > 0;
    if (detailsChanged) {
      const { is_active: _b, ...oldDetails } = before;
      const { is_active: _a, ...newDetails } = after;
      void _b;
      void _a;
      await auditLog({
        userEmail,
        action: "device_update",
        target: `device:${id}`,
        oldValue: forAudit(oldDetails),
        newValue: forAudit(newDetails),
      });
    }
    if (isActive !== undefined && isActive !== before.is_active) {
      await auditLog({
        userEmail,
        action: "device_set_active",
        target: `device:${id}`,
        oldValue: { name: before.name, is_active: before.is_active },
        newValue: { name: after.name, is_active: after.is_active },
      });
    }

    revalidateTag(DEVICES_TAG, { expire: 0 });
    return NextResponse.json({ ok: true, id, isActive: after.is_active });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Saving the phone failed" },
      { status: err instanceof DeviceWriteError ? err.status : 502 },
    );
  }
}
