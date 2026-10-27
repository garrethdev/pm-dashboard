import { StatusPill } from "@/components/ui/pill";
import type { SchedulerRun } from "@/lib/data/calendar";

/**
 * The scheduler run that planned today, compressed to a pill for the page
 * header. Since 2026-10-27 it plans three days at a time, so that run can be
 * up to two days old.
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
        <span title="The Smart Scheduler plans three days at a time, at 01:00 ET every third night.">
          Smart Scheduler: no run in 3 days
        </span>
      </StatusPill>
    );
  }

  const tone = run.status === "error" ? "danger" : run.status === "partial" ? "warn" : "ok";
  const ranAt = new Date(run.runAt).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
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
