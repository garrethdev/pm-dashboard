import { Suspense } from "react";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { getDemandSupply, getInventory } from "@/lib/data/inventory";
import { DemandSupplyCard } from "@/components/dashboard/demand-supply-card";
import { ProductionOrderCard } from "@/components/dashboard/production-order-card";
import { formatEtShort } from "@/lib/data/format";

async function InventoryLive() {
  let data, fetchedAt, demand;
  try {
    ({ data, fetchedAt } = await getInventory());
    // 14d is the default window and reproduces inventory_check exactly.
    demand = (await getDemandSupply(14)).data;
  } catch (err) {
    return (
      <DashCard title="Demand vs supply">
        <p className="text-sm text-text-muted">
          Supabase unreachable — {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }

  const fetched = formatEtShort(fetchedAt);

  return (
    <>
      <DemandSupplyCard initial={demand} />

      <ProductionOrderCard rows={data.productionOrder} fetchedAt={fetched} />
    </>
  );
}

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Inventory</h1>
      <Suspense fallback={<CardSkeleton title="Demand vs supply" lines={8} />}>
        <InventoryLive />
      </Suspense>
    </div>
  );
}
