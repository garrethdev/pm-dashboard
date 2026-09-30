import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a generator page shows while its server read is still running: the
 * title row and a pulsing card, so a press on a tile or a row answers at
 * once (found by the QA agent on 2026-09-26, whose click on a library tile
 * looked dead while the page was being fetched).
 */
export function PageSkeleton({ back = true, grid = 0 }: { back?: boolean; grid?: number }) {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      {back && <Skeleton className="h-4 w-28" />}
      <Skeleton className="h-7 w-56" />
      {grid > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: grid }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      )}
    </div>
  );
}
