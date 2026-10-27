import { DashCard } from "@/components/ui/card";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { getReports } from "@/lib/data/reports";

/**
 * Reports sent from the floating button, issues and observations (Garreth,
 * 2026-10-09; was Issues until 2026-10-27). Reached from that button only —
 * deliberately not in the menu.
 */
export default async function ReportsPage() {
  let reports;
  try {
    reports = await getReports();
  } catch (err) {
    return (
      <DashCard title="Reports">
        <p className="text-sm text-text-muted">
          Supabase unreachable: {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
  return <ReportsTable reports={reports} />;
}
