import { getPhysicalProfiles, limitIncidents } from "@/lib/data/fleet-accounts";
import { getFleet } from "@/lib/fleet-server";
import { DashCard } from "@/components/ui/card";
import { IncidentHistory } from "@/components/dashboard/incident-history";
import { getIncidentHistory } from "@/lib/data/incidents";

/**
 * Full incident history — reached from "View all" on the dashboard card, not
 * from the sidebar (deliberately: it is a drill-down, not a top-level area).
 */
const DEFAULT_RANGE = "30d" as const;

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  // ?focus=<incident id> — set by the bell, so a notification lands on its row.
  const { focus } = await searchParams;
  let data;
  try {
    // Only the fleet being looked at: an incident follows its account.
    data = limitIncidents(
      (await getIncidentHistory(DEFAULT_RANGE)).data,
      await getFleet(),
      new Set((await getPhysicalProfiles()).data),
    );
  } catch (err) {
    return (
      <DashCard title="Incidents">
        <p className="text-sm text-text-muted">
          Supabase unreachable: {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
  return <IncidentHistory initial={data} initialRange={DEFAULT_RANGE} focus={focus ?? null} />;
}
