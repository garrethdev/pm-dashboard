import { CardSkeleton } from "@/components/ui/card-skeleton";

/**
 * Overrides the parent /analytics loading state for this nested route, which
 * would otherwise flash "Analytics" before a page headed "Top content
 * analysis". A skeleton with the wrong heading is worse than none: it reads as
 * the app having navigated somewhere else.
 */
export default function AnalysisLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Top content analysis</h1>
      <CardSkeleton title="Analysis" lines={12} />
    </div>
  );
}
