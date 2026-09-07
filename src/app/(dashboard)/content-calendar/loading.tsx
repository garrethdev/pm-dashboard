import { CardSkeleton } from "@/components/ui/card-skeleton";

/**
 * Route-level loading state. Next prefetches this with the static shell, so it
 * paints the instant the link is clicked instead of after the server answers —
 * from Manila that gap is roughly half a second of a page that looks frozen.
 * Card titles are read off the real components so the swap moves nothing.
 */
export default function ContentCalendarLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Content calendar</h1>
      <CardSkeleton title="Content calendar" lines={12} />
      <CardSkeleton title="Per-account posting limits" lines={10} />
    </div>
  );
}
