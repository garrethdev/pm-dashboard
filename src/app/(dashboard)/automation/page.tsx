import { Suspense } from "react";
import { ExternalLink } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { StatusPill } from "@/components/ui/pill";
import { getAutomationStatuses, workflowsForFleet } from "@/lib/data/automation";
import { RUN_STATE_TONE, formatEtShort } from "@/lib/data/format";
import { upstreamMessage } from "@/lib/data/upstream-error";
import { getFleet } from "@/lib/fleet-server";

function formatDuration(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 90) return `${sec}s`;
  return `${Math.round(sec / 60)}m ${sec % 60}s`;
}

/** The `try` guards the read only — see the note in accounts/page.tsx. */
async function AutomationTable() {
  const fleet = await getFleet();
  let data;
  try {
    data = await getAutomationStatuses();
  } catch (err) {
    return (
      <DashCard title="Daily workflows">
        <p className="text-sm text-text-muted">{upstreamMessage(err, "n8n")}</p>
      </DashCard>
    );
  }

  return (
    <DashCard title="Daily workflows" fetchedAt={formatEtShort(data.fetchedAt)}>
      {/* Scrolls rather than squeezes. Six columns do not fit a phone, and
          without a floor the table compressed until "Smart Scheduler" wrapped
          onto two lines and the right-hand columns fell off the card anyway. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm whitespace-nowrap [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Workflow</th>
              <th className="pb-2 font-medium">Expected</th>
              <th className="pb-2 font-medium">Last run (ET)</th>
              <th className="pb-2 text-right font-medium">Duration</th>
              <th className="pb-2 text-right font-medium">Execution</th>
            </tr>
          </thead>
          <tbody>
            {workflowsForFleet(data.rows, fleet).map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-card-raised/50">
                <td className="py-3">
                  <StatusPill tone={RUN_STATE_TONE[row.state]}>{row.label}</StatusPill>
                </td>
                <td className="py-3">
                  <span className="font-medium">{row.name}</span>
                  {row.note && <span className="ml-2 text-xs text-warn">⚠ {row.note}</span>}
                </td>
                <td className="py-3 text-text-muted">{row.expected}</td>
                <td className="py-3 tnum">{row.lastRunLabel}</td>
                <td className="py-3 text-right tnum">{formatDuration(row.durationSec)}</td>
                <td className="py-3 text-right">
                  {row.executionUrl ? (
                    <a
                      href={row.executionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:opacity-80"
                    >
                      Open <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashCard>
  );
}

export default function AutomationPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Automation</h1>
      <Suspense fallback={<CardSkeleton title="Daily workflows" lines={12} />}>
        <AutomationTable />
      </Suspense>
    </div>
  );
}
