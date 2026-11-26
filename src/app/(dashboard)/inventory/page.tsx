import { Suspense } from "react";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { getInventory } from "@/lib/data/inventory";
import { ProductionOrderCard } from "@/components/dashboard/production-order-card";
import { getFleet } from "@/lib/fleet-server";
import { formatEtShort } from "@/lib/data/format";

/**
 * Simplified on 2026-11-26 (Garreth): one table, "What to make next". The
 * Demand vs supply card and the "Waiting to be switched on" note were removed.
 */
async function InventoryLive() {
  let data, fetchedAt;
  try {
    // Only the fleet being looked at (Cloud or Physical, top right).
    const fleet = await getFleet();
    ({ data, fetchedAt } = await getInventory(fleet));
  } catch (err) {
    return (
      <DashCard title="What to make next">
        <p className="text-sm text-text-muted">
          Supabase unreachable: {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }

  return <ProductionOrderCard rows={data.productionOrder} fetchedAt={formatEtShort(fetchedAt)} />;
}

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Inventory</h1>
      <Suspense fallback={<CardSkeleton title="What to make next" lines={8} />}>
        <InventoryLive />
      </Suspense>
    </div>
  );
}
