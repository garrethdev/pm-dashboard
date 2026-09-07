import { DashCard } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { getAutomationStatuses } from "@/lib/data/automation";
import { RUN_STATE_TONE, formatEtShort } from "@/lib/data/format";

/** Homepage automation lights — the 6 key workflows, live from n8n. */
export async function AutomationCard({ className }: { className?: string }) {
  let content: React.ReactNode;
  let fetchedAt: string | undefined;

  try {
    const data = await getAutomationStatuses();
    const keyRows = data.rows.filter((r) => r.key);
    fetchedAt = formatEtShort(data.fetchedAt);
    content = (
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
    );
  } catch (err) {
    content = (
      <p className="text-sm text-text-muted">
        n8n unreachable: {err instanceof Error ? err.message : "unknown error"}
      </p>
    );
  }

  return (
    <DashCard title="Automation" fetchedAt={fetchedAt} viewAllHref="/automation" className={className}>
      {content}
    </DashCard>
  );
}
