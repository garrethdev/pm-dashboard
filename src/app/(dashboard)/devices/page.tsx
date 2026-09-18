import { Suspense } from "react";
import { DashCard } from "@/components/ui/card";
import { DevicesView } from "@/components/dashboard/devices-view";
import { getDevices, signProofUrls } from "@/lib/data/devices";
import { upstreamMessage } from "@/lib/data/upstream-error";
import DevicesLoading from "./loading";

/** The `try` guards the read only — see the note in accounts/page.tsx. */
async function DevicesLive() {
  let devices;
  let proofUrls;
  try {
    ({ data: devices } = await getDevices());
    // Signed on every render and never cached: the links live ten minutes, and
    // a remembered link is a broken thumbnail.
    proofUrls = await signProofUrls(devices.flatMap((d) => (d.proofPath ? [d.proofPath] : [])));
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Devices</h1>
        <DashCard title="Phones">
          <p className="text-sm text-text-muted">{upstreamMessage(err, "The list of phones")}</p>
        </DashCard>
      </div>
    );
  }

  return <DevicesView devices={devices} proofUrls={proofUrls} />;
}

export default function DevicesPage() {
  return (
    <Suspense fallback={<DevicesLoading />}>
      <DevicesLive />
    </Suspense>
  );
}
