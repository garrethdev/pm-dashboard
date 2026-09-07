import { DashCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

/**
 * Overrides the parent /analytics loading state for this nested route, which
 * would otherwise flash a skeleton headed "Analytics" above a page headed "Top
 * content analysis" — that reads as having navigated somewhere else.
 */
export default function AnalysisLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Top content analysis</h1>
      <DashCard title="Analysis" toolbar={<Skeleton className="h-[26px] w-[132px] rounded-full" />}>
        <TableSkeleton rows={10} />
      </DashCard>
    </div>
  );
}
