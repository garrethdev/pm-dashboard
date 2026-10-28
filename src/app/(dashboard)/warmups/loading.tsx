import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors WarmupsView: the title, four tiles, then the two-column sections. */
export default function WarmupsLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex min-h-9 items-center">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Warmups</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[104px] w-full rounded-nested" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-[220px] w-full rounded-[20px]" />
        <Skeleton className="h-[220px] w-full rounded-[20px]" />
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-[240px] w-full rounded-[20px]" />
        <Skeleton className="h-[240px] w-full rounded-[20px]" />
      </div>
    </div>
  );
}
