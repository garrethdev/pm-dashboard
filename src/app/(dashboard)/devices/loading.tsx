import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors DevicesView: the title row, then phone tiles. */
export default function DevicesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Devices</h1>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[146px] w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
