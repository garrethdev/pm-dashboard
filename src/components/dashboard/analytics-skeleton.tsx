import { Card, DashCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The Analytics body as placeholders.
 *
 * Every container here is the real one — same wrappers, same grid spans, same
 * fixed heights read off the components rather than eyeballed:
 *
 *   Views chart          -mb-5 h-full min-h-64   (ViewsTrend)
 *   Avg views by char.   h-full min-h-[200px]    (CharacterBars)
 *   Top content types    h-[300px]               (ContentTypes)
 *   Account performance  max-h-[520px]           (AccountPerformance)
 *
 * Only the leaf text and chart areas are swapped for pulsing blocks, so the
 * skeleton occupies the same space as the data and nothing resizes when the
 * two swap. Static labels stay real text — they do not change with the range,
 * and a greyed-out word is less informative than the word.
 *
 * Shared by loading.tsx and by the in-page state during a range switch, so
 * arriving at the page and changing its range cannot drift apart.
 */
export function AnalyticsSkeleton({
  /** Rows to draw in the account table. The view passes its current count so a
   *  range switch does not change the table's height; 12 fills the 520px cap. */
  accountRows = 12,
  /** Rows in the content-types table. Its container is a fixed 300px, so this
   *  only affects how full it looks, never the card's size. */
  contentTypeRows = 7,
}: {
  accountRows?: number;
  contentTypeRows?: number;
} = {}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 xl:grid-cols-5">
        <div className="flex flex-col gap-3 xl:col-span-2">
          {/* BestAccountTile: label, then avatar beside two lines. */}
          <div className="dot-fade flex flex-col gap-2.5 rounded-nested border border-border bg-card-raised px-4 py-3 text-text-muted">
            <span className="relative z-10 text-xs text-text-muted">Best performing account</span>
            <span className="relative z-10 flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <span className="flex min-w-0 flex-col gap-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {["Posts", "Total views", "Avg views", "Engagement rate"].map((label) => (
              <div
                key={label}
                className="dot-fade flex flex-col justify-between gap-2 overflow-hidden rounded-nested border border-border bg-card-raised px-4 py-3 text-text-muted"
              >
                <span className="relative z-10 text-xs text-text-muted">{label}</span>
                <div className="relative z-10 flex flex-wrap items-baseline justify-between gap-x-2">
                  {/* text-2xl leading-none — 24px tall, same as the real value. */}
                  <Skeleton className="h-6 w-20" />
                </div>
                {/* The sparkline slot, kept at its exact height. */}
                <div className="relative z-10 -mx-4 h-7" />
              </div>
            ))}
          </div>
        </div>

        <DashCard
          title="Views"
          className="min-h-full xl:col-span-3"
          toolbar={<Skeleton className="h-[26px] w-[132px] rounded-full" />}
          actions={<Skeleton className="h-4 w-28" />}
        >
          <div className="-mb-5 h-full min-h-64 w-full">
            <Skeleton className="size-full" />
          </div>
        </DashCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-5">
        <DashCard title="Avg views by character" className="xl:col-span-2">
          <div className="h-full min-h-[200px] w-full">
            <Skeleton className="size-full" />
          </div>
        </DashCard>

        <DashCard
          title="Top content types per character"
          className="xl:col-span-3"
          toolbar={<Skeleton className="h-[26px] w-40 rounded-full" />}
        >
          <div className="flex h-[300px] flex-col gap-1 overflow-hidden">
            {Array.from({ length: contentTypeRows }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full shrink-0" />
            ))}
          </div>
        </DashCard>
      </div>

      <Card className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Account performance</h2>
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex max-h-[520px] flex-col gap-1 overflow-hidden">
          {Array.from({ length: accountRows }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full shrink-0" />
          ))}
        </div>
      </Card>
    </div>
  );
}
