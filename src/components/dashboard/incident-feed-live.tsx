import { DashCard } from "@/components/ui/card";
import { IncidentFeed } from "@/components/dashboard/incident-feed";
import { getIncidents } from "@/lib/data/incidents";
import { upstreamMessage } from "@/lib/data/upstream-error";

/** Server wrapper: fetches incidents, hands off to the client view (5 rows +
 *  View more). The `try` guards the read only — see accounts/page.tsx. */
export async function IncidentFeedLive({ className }: { className?: string }) {
  let data;
  try {
    ({ data } = await getIncidents());
  } catch (err) {
    return (
      <DashCard title="Incident feed, last 48h" className={className}>
        <p className="text-sm text-text-muted">{upstreamMessage(err, "Supabase")}</p>
      </DashCard>
    );
  }

  return <IncidentFeed incidents={data} className={className} />;
}
