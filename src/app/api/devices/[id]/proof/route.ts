import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { DEVICES_TAG } from "@/lib/data/cache";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import { parseRowId, proofRefusal } from "@/lib/data/device-rules";
import { DeviceWriteError, getDeviceState, uploadDeviceProof } from "@/lib/data/device-writes";

/**
 * POST /api/devices/[id]/proof — store the phone's whoer.net screenshot.
 *
 * multipart/form-data with one `file`. The picture goes to the private
 * device-proofs bucket with the service key; the browser never gets a way to
 * write to the bucket itself, and only ever sees short-lived signed links.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const id = parseRowId((await params).id);
  if (id === null) return NextResponse.json({ error: "invalid phone" }, { status: 400 });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "invalid upload" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a screenshot to upload." }, { status: 400 });
  }
  const refusal = proofRefusal(file);
  if (refusal) return NextResponse.json({ error: refusal }, { status: 400 });

  try {
    const userEmail = await actingUserEmail();
    const device = await getDeviceState(id);
    if (!device) return NextResponse.json({ error: "That phone no longer exists." }, { status: 404 });

    const { path } = await uploadDeviceProof(device, file);
    await auditLog({
      userEmail,
      action: "device_proof_upload",
      target: `device:${id}`,
      oldValue: { name: device.name, whoer_screenshot_path: device.whoer_screenshot_path },
      newValue: { name: device.name, whoer_screenshot_path: path, bytes: file.size },
    });

    revalidateTag(DEVICES_TAG, { expire: 0 });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The screenshot did not upload" },
      { status: err instanceof DeviceWriteError ? err.status : 502 },
    );
  }
}
