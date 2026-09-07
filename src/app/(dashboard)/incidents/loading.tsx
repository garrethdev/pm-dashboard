import { DashCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

/**
 * Mirrors IncidentHistory's frame: the heading shares a wrap row with the range
 * pills and the "as of" stamp, so both are held open here. Without them the
 * table would start ~26px higher than it does once loaded and jump on arrival.
 */
export default function IncidentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-xl font-semibold">Incidents</h1>
        <Skeleton className="h-[26px] w-[160px] rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <DashCard title="Incident history">
        <TableSkeleton rows={12} />
      </DashCard>
    </div>
  );
}
