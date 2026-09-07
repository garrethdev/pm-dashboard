import { DashCard } from "@/components/ui/card";
import { IncidentFeed } from "@/components/dashboard/incident-feed";
import { getIncidents } from "@/lib/data/incidents";

/** Server wrapper: fetches incidents, hands off to the client view (5 rows + View more). */
export async function IncidentFeedLive({ className }: { className?: string }) {
  try {
    const { data } = await getIncidents();
    return <IncidentFeed incidents={data} className={className} />;
  } catch (err) {
    return (
      <DashCard title="Incident feed, last 48h" className={className}>
        <p className="text-sm text-text-muted">
          Data unavailable: {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
}
