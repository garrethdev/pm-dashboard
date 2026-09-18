import { notFound } from "next/navigation";
import { DeviceDetail } from "@/components/dashboard/device-detail";
import { parseRowId } from "@/lib/data/device-rules";
import { getAssignableAccounts, getDevice, signProofUrls } from "@/lib/data/devices";

export default async function DevicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ proof?: string }>;
}) {
  const id = parseRowId((await params).id);
  if (id === null) notFound();

  const [{ data: device }, { data: assignable }, query] = await Promise.all([
    getDevice(id),
    getAssignableAccounts(),
    searchParams,
  ]);
  if (!device) notFound();

  // Signed per request, never cached — the screenshot shows the phone's proxy
  // IP, so the link is short-lived and made with the service key.
  const proofUrl = device.proofPath
    ? ((await signProofUrls([device.proofPath]))[device.proofPath] ?? null)
    : null;

  return (
    <DeviceDetail
      device={device}
      proofUrl={proofUrl}
      assignable={assignable}
      initialNotice={
        query.proof === "failed" && !device.proofPath
          ? "The phone was saved, but the screenshot did not upload. Add it here."
          : null
      }
    />
  );
}
