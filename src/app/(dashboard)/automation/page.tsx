import { Suspense } from "react";
import { ExternalLink } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { StatusPill } from "@/components/ui/pill";
import { getAutomationStatuses } from "@/lib/data/automation";
import { RUN_STATE_TONE, formatEtShort } from "@/lib/data/format";

function formatDuration(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 90) return `${sec}s`;
  return `${Math.round(sec / 60)}m ${sec % 60}s`;
}

async function AutomationTable() {
  let body: React.ReactNode;
  let fetchedAt: string | undefined;

  try {
    const data = await getAutomationStatuses();
    fetchedAt = formatEtShort(data.fetchedAt);
    // Scrolls rather than squeezes. Six columns do not fit a phone, and without
    // a floor the table compressed until "Smart Scheduler" wrapped onto two
    // lines and the right-hand columns fell off the card anyway.
    body = (
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
          {data.rows.map((row) => (
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
    );
  } catch (err) {
    body = (
      <p className="text-sm text-text-muted">
        n8n unreachable: {err instanceof Error ? err.message : "unknown error"}
      </p>
    );
  }

  return (
    <DashCard title="Daily workflows" fetchedAt={fetchedAt}>
      <div className="overflow-x-auto">{body}</div>
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
