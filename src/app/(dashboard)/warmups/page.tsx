import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashCard } from "@/components/ui/card";
import { WarmupsView } from "@/components/dashboard/warmups-view";
import { upstreamMessage } from "@/lib/data/upstream-error";
import { getWarmupOverview } from "@/lib/data/warmup-overview";
import { getFleet } from "@/lib/fleet-server";
import WarmupsLoading from "./loading";

/** The `try` guards the read only — see the note in accounts/page.tsx. */
async function WarmupsLive() {
  let data;
  try {
    data = await getWarmupOverview();
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Warmups</h1>
        <DashCard title="Warmups">
          <p className="text-sm text-text-muted">{upstreamMessage(err, "The warmups")}</p>
        </DashCard>
      </div>
    );
  }
  return <WarmupsView data={data} />;
}

/**
 * The warmup robot at a glance (Garreth, 2026-10-28). Physical only: the
 * robot works real phones, and the Cloud menu stays as it was. Everyone signed
 * in sees it.
 */
export default async function WarmupsPage() {
  if ((await getFleet()) !== "physical") redirect("/");
  return (
    <Suspense fallback={<WarmupsLoading />}>
      <WarmupsLive />
    </Suspense>
  );
}
