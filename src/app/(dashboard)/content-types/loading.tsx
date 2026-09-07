import { CardSkeleton } from "@/components/ui/card-skeleton";

/**
 * Route-level loading state. Next prefetches this with the static shell, so it
 * paints the instant the link is clicked instead of after the server answers —
 * from Manila that gap is roughly half a second of a page that looks frozen.
 * Card titles are read off the real components so the swap moves nothing.
 */
export default function ContentTypesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Content types</h1>
      <CardSkeleton title="Content types" lines={12} />
    </div>
  );
}
