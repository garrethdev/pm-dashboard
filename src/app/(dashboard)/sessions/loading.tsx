import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

/** Mirrors SessionsView: the title row, then the sessions table. */
export default function SessionsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Sessions</h1>
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      <div className="rounded-card border border-border bg-card p-5 shadow-card">
        <Skeleton className="mb-6 h-5 w-40" />
        <TableSkeleton rows={6} />
      </div>
    </div>
  );
}
