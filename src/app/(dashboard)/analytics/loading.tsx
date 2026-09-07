import { AnalyticsSkeleton } from "@/components/dashboard/analytics-skeleton";

/**
 * Route-level loading state. Shares AnalyticsSkeleton with the in-page state
 * the view shows while a range switch is in flight, so arriving at the page and
 * changing its range look like the same thing happening.
 */
export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Analytics</h1>
      <AnalyticsSkeleton />
    </div>
  );
}
