import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { DEVICES_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import { parseDeviceFields } from "@/lib/data/device-rules";
import { createDevice, DeviceWriteError } from "@/lib/data/device-writes";

/** POST /api/devices — register a physical phone (PF-02). The proof screenshot
 *  follows in a second request to /api/devices/[id]/proof. */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object") throw new Error("not an object");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = parseDeviceFields(body, { requireName: true });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const userEmail = await actingUserEmail();
    const device = await createDevice(parsed.fields);
    await auditLog({
      userEmail,
      action: "device_create",
      target: `device:${device.id}`,
      newValue: { ...device, proxy: device.proxy ? "(set)" : null },
    });

    revalidateTag(DEVICES_TAG, { expire: 0 });
    return NextResponse.json({ ok: true, id: device.id, name: device.name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Saving the phone failed" },
      { status: err instanceof DeviceWriteError ? err.status : 502 },
    );
  }
}
