import { DashCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

/**
 * Mirrors InventoryPage: the same two DashCards in the same order, with the
 * demand card's toolbar (window pills + the date range beside them) held open
 * so the card header is the height it will be once the data lands.
 */
export default function InventoryLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Inventory</h1>
      <DashCard
        title="Demand vs supply"
        toolbar={
          <>
            <Skeleton className="h-[26px] w-[132px] rounded-full" />
            <Skeleton className="h-4 w-44" />
          </>
        }
      >
        <TableSkeleton rows={8} />
      </DashCard>
      <DashCard title="What to make next">
        <TableSkeleton rows={6} />
      </DashCard>
    </div>
  );
}
