import { DashCard } from "@/components/ui/card";
import { AnalyticsView } from "@/components/dashboard/analytics-charts";
import { getAnalytics } from "@/lib/data/analytics";

/*
 * Analytics — the web version of the weekly combined IG + TikTok report.
 * Every figure is live from Supabase; the per-account verdicts are the same
 * v_account_health_v3 rows the Accounts table renders. The platform switcher
 * picks a pre-computed slice rather than recombining numbers client-side —
 * a median cannot be derived from two platform medians.
 *
 * The <h1> lives only in AnalyticsView, never in the Suspense fallback: two
 * headings for the same page, one inside the boundary and one outside, left
 * the fallback mounted next to the resolved tree and that subtree never
 * finished hydrating (the platform pills rendered but did nothing).
 */

async function AnalyticsLive() {
  let data;
  try {
    ({ data } = await getAnalytics());
  } catch (err) {
    return (
      <DashCard title="Analytics">
        <p className="text-sm text-text-muted">
          Supabase unreachable — {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
  return <AnalyticsView initial={data} />;
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-3">
      <AnalyticsLive />
    </div>
  );
}
