import { DashCard } from "@/components/ui/card";
import { IssuesTable } from "@/components/dashboard/issues-table";
import { getIssues } from "@/lib/data/issues";

/**
 * Issues reported from the floating button (Garreth, 2026-10-09). Reached from
 * that button only — deliberately not in the menu.
 */
export default async function IssuesPage() {
  let issues;
  try {
    issues = await getIssues();
  } catch (err) {
    return (
      <DashCard title="Issues">
        <p className="text-sm text-text-muted">
          Supabase unreachable: {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
  return <IssuesTable issues={issues} />;
}
