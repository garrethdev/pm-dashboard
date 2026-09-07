import { CardSkeleton } from "@/components/ui/card-skeleton";

/**
 * Route-level loading state. Next prefetches this with the static shell, so it
 * paints the instant the link is clicked instead of after the server answers —
 * from Manila that gap is roughly half a second of a page that looks frozen.
 * Card titles are read off the real components so the swap moves nothing.
 */
export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Analytics</h1>
      <CardSkeleton title="Analytics" lines={14} />
    </div>
  );
}
