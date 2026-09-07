import { Card, DashCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Mirrors ContentCalendarPage. The calendar card is built from Card rather than
 * DashCard because its real title is the month name, which DashCard takes as a
 * string — and a skeleton cannot name the month without asserting one. The
 * header is assembled by hand instead, matching DashCard's own frame
 * (gap-5, one wrap row, body in a flex-1 box).
 *
 * The grid is the real one: 7 columns at gap-1.5 inside a min-w-[46rem] scroll
 * box, with cells at the day tile's min-h-[9rem]. Five weeks is the common
 * month; a six-week month grows by one row on arrival.
 *
 * Weekday names stay real text — they are the same every month.
 */
export default function ContentCalendarLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold">Content calendar</h1>
          <Skeleton className="h-[26px] w-36 rounded-full" />
        </div>
        <Skeleton className="h-[26px] w-36 rounded-full" />
      </div>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Skeleton className="h-5 w-36" />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Skeleton className="h-[26px] w-24 rounded-full" />
          </div>
        </div>
        <div className="min-h-0 min-w-0 flex-1">
          <div className="overflow-x-auto">
            <div className="min-w-[46rem]">
              <div className="grid grid-cols-7 gap-1.5 pb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-1 text-xs font-medium text-text-muted">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }, (_, i) => (
                  <Skeleton key={i} className="min-h-[9rem] w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <DashCard title="Per-account posting limits">
        <TableSkeleton rows={10} />
      </DashCard>
    </div>
  );
}
