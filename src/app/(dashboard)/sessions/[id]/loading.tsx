import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors SessionDetail: the title, the facts card, the read, the frames. */
export default function SessionLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-64" />
        </div>
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      <Skeleton className="h-20 w-full rounded-card" />
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-96 w-full rounded-card" />
    </div>
  );
}
