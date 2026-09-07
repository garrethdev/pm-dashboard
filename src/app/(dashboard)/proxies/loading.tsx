import { DashCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

/**
 * Mirrors ProxiesPage. The card carries a search box and a pill switcher
 * between the two tables, plus the provider balance cards, so those are held
 * open rather than letting the table start high and drop on arrival.
 */
export default function ProxiesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Proxies &amp; phones</h1>
      <DashCard
        title="Proxies"
        toolbar={<Skeleton className="h-[26px] w-[150px] rounded-full" />}
        actions={<Skeleton className="h-[26px] w-40 rounded-full" />}
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <TableSkeleton rows={12} />
        </div>
      </DashCard>
    </div>
  );
}
