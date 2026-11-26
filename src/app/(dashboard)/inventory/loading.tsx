import { DashCard } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/table-skeleton";

/** Mirrors InventoryPage: its one card, "What to make next". */
export default function InventoryLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Inventory</h1>
      <DashCard title="What to make next">
        <TableSkeleton rows={8} />
      </DashCard>
    </div>
  );
}
