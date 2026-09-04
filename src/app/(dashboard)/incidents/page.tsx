import { DashCard } from "@/components/ui/card";
import { IncidentHistory } from "@/components/dashboard/incident-history";
import { getIncidentHistory } from "@/lib/data/incidents";

/**
 * Full incident history — reached from "View all" on the dashboard card, not
 * from the sidebar (deliberately: it is a drill-down, not a top-level area).
 */
const DEFAULT_RANGE = "30d" as const;

export default async function IncidentsPage() {
  let data;
  try {
    ({ data } = await getIncidentHistory(DEFAULT_RANGE));
  } catch (err) {
    return (
      <DashCard title="Incidents">
        <p className="text-sm text-text-muted">
          Supabase unreachable — {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
  return <IncidentHistory initial={data} initialRange={DEFAULT_RANGE} />;
}
