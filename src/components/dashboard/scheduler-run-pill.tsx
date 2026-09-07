import { StatusPill } from "@/components/ui/pill";
import type { SchedulerRun } from "@/lib/data/calendar";

/**
 * Today's scheduler run, compressed to a pill for the page header.
 *
 * It was a full card until Garreth cut it down (2026-09-06): on a normal day
 * the only thing worth reading is "did it run and did it fill". The rest —
 * accounts considered, duration, the error step — moved into the hover, and
 * the per-day detail already lives in the day panel.
 */
export function SchedulerRunPill({ run }: { run: SchedulerRun | null }) {
  if (!run) {
    return (
      <StatusPill tone="warn" className="cursor-default">
        <span title="The Smart Scheduler runs at 06:30 ET.">Smart Scheduler not yet run</span>
      </StatusPill>
    );
  }

  const tone = run.status === "error" ? "danger" : run.status === "partial" ? "warn" : "ok";
  const ranAt = new Date(run.runAt).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
  });

  const detail = [
    `ran ${ranAt} ET${run.dryRun ? " (dry run)" : ""}`,
    `${run.accountsConsidered} accounts considered`,
    run.shortfallCount > 0 ? `${run.shortfallCount} shortfalls` : null,
    run.durationMs !== null ? `took ${(run.durationMs / 1000).toFixed(1)}s` : null,
    run.errorMessage ? `failed at ${run.errorStep ?? "unknown step"}: ${run.errorMessage}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <StatusPill tone={tone} className="cursor-default">
      <span title={`${run.rowsScheduled}/${run.slotsPlanned} scheduled, ${detail}`}>
        Smart Scheduler {run.status}
      </span>
    </StatusPill>
  );
}
