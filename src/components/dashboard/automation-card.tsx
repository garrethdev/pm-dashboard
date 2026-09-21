import { DashCard } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { getAutomationStatuses, workflowsForFleet } from "@/lib/data/automation";
import { RUN_STATE_TONE, formatEtShort } from "@/lib/data/format";
import { upstreamMessage } from "@/lib/data/upstream-error";
import { getFleet } from "@/lib/fleet-server";

/** Homepage automation lights — the 6 key workflows, live from n8n.
 *
 *  The `try` guards the read only — see the note in accounts/page.tsx. */
export async function AutomationCard({ className }: { className?: string }) {
  const fleet = await getFleet();
  let data;
  try {
    data = await getAutomationStatuses();
  } catch (err) {
    return (
      <DashCard title="Automation" viewAllHref="/automation" className={className}>
        <p className="text-sm text-text-muted">{upstreamMessage(err, "n8n")}</p>
      </DashCard>
    );
  }

  const keyRows = workflowsForFleet(data.rows, fleet).filter((r) => r.key);
  return (
    <DashCard
      title="Automation"
      fetchedAt={formatEtShort(data.fetchedAt)}
      viewAllHref="/automation"
      className={className}
    >
      <div className="flex flex-col divide-y divide-border">
        {keyRows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-2 py-2.5">
            <span className="truncate text-sm">{row.name}</span>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="text-xs text-text-muted tnum">{row.lastRunLabel}</span>
              <StatusPill tone={RUN_STATE_TONE[row.state]}>{row.label}</StatusPill>
            </div>
          </div>
        ))}
      </div>
    </DashCard>
  );
}
