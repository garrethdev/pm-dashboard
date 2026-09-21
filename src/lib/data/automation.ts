import { UNREACHABLE, makeExecutionsFetcher, type ExecutionRead } from "@/lib/data/n8n";
import type { Fleet } from "@/lib/fleet";

/**
 * The tracked workflow list — hardcoded per plan §8 (IDs are stable).
 * `schedule` drives the overdue computation: past expected time + 30 min
 * grace with no successful run today (ET) ⇒ overdue.
 */
type Schedule =
  | { type: "daily"; hour: number; minute: number }
  | { type: "dow"; days: number[]; hour: number; minute: number } // 0=Sun … 6=Sat, ET
  | { type: "interval"; minutes: number }
  | { type: "none" };

export interface TrackedWorkflow {
  id: string;
  name: string;
  expected: string;
  schedule: Schedule;
  /** Shown on the homepage card (the 6 most important). */
  key?: boolean;
  note?: string;
}

export const TRACKED_WORKFLOWS: TrackedWorkflow[] = [
  { id: "Jaf78Yt9XAuj9PNJ", name: "Smart Scheduler", expected: "daily 06:30 ET", schedule: { type: "daily", hour: 6, minute: 30 }, key: true },
  { id: "lioNzkWRocyDvZS5", name: "Posting Agent", expected: "daily 10:00 ET", schedule: { type: "daily", hour: 10, minute: 0 }, key: true },
  { id: "QDUtABHSG4FMTrQX", name: "Warmup Scheduler", expected: "daily", schedule: { type: "none" }, key: true },
  { id: "ARmIDPrV77c0k4zA", name: "Task Detail Poller", expected: "hourly + 07:00 digest", schedule: { type: "interval", minutes: 60 }, key: true },
  // Ran at 14:00 ET, not 02:00, for seven weeks: the workflow had no
  // settings.timezone so its "0 2 * * *" cron resolved against the n8n instance
  // default (Asia/Manila). The dashboard showed it Overdue every morning as a
  // result. Timezone is now pinned to America/New_York and the cron moved to
  // 14:00 ET, which is where it was actually running — 4h after the Posting
  // Agent, so a failed post reconciles the same day.
  { id: "gHoiFBpQkrkGvTto", name: "Failed-Post Reconcile", expected: "daily 14:00 ET", schedule: { type: "daily", hour: 14, minute: 0 }, key: true },
  // Not `key`: the GeeLark Wallet card now shows the live balance directly, so
  // the guard's run status doesn't need homepage space (Garreth 2026-09-02).
  { id: "hKuVooWj5NRkcUex", name: "Wallet Guard", expected: "daily 08:00 ET", schedule: { type: "daily", hour: 8, minute: 0 } },
  { id: "xbyXTQG8XJ59qo1V", name: "Missed-Run Alarm", expected: "daily 08:30 ET", schedule: { type: "daily", hour: 8, minute: 30 } },
  { id: "KGBE446F9K51ugtd", name: "Analytics Freshness Alarm", expected: "daily 10:00 ET", schedule: { type: "daily", hour: 10, minute: 0 } },
  // Tracked so its failures reach the incident feed: incidents.ts only surfaces
  // errored executions for workflows in THIS list. Its upsert now stops the run
  // on error rather than swallowing it (2026-09-02), and that is only useful if
  // someone sees the red. Cron is 0 30 8 * * 0,1,3,5 with the workflow pinned
  // to America/New_York.
  { id: "84bcYyXfCgtLB7y4", name: "TikTok Analytics Engine", expected: "Sun/Mon/Wed/Fri 08:30 ET", schedule: { type: "dow", days: [0, 1, 3, 5], hour: 8, minute: 30 } },
  // The gap-day half of the pair above. The engine only runs 4 days a week, so
  // between its runs the "Last 5 posts" card could sit up to 46h behind what is
  // actually on TikTok. This one covers Tue/Thu/Sat with a single-page fetch
  // (10 videos, ~4 days — no pagination) straight into tt_post_performance, and
  // stops there: no outlier judging, no report, no email. Worst-case staleness
  // is now under 24h. Tracked here for the same reason as the engine — a silent
  // stop would leave the card quietly stale while everything else looked fine.
  { id: "61cCaXSQ4bk1q4xv", name: "Recent Posts Refresh", expected: "Tue/Thu/Sat 08:30 ET", schedule: { type: "dow", days: [2, 4, 6], hour: 8, minute: 30 } },
  // The workflow that actually judges whether accounts are being SEEN. Its
  // verdict is what the Health column renders (via v_account_health_v3), so if
  // it stops running the email goes quiet while the dashboard keeps working —
  // exactly the kind of silent stop this card exists to catch.
  { id: "2Goujvw8qSvVzIfo", name: "View-Collapse Detector", expected: "Tue/Fri 08:00 ET", schedule: { type: "dow", days: [2, 5], hour: 8, minute: 0 }, key: true },
  // Named "Account Health Check" upstream, but it is a LIVENESS check — it logs
  // in and scrolls. A soft-banned account passes it while its reach is throttled
  // to nothing, so it is not evidence of health (see The False Green).
  { id: "CXVxRMOUkLluRdBc", name: "Account Login Check", expected: "Tue/Fri 07:00 ET", schedule: { type: "dow", days: [2, 5], hour: 7, minute: 0 } },
  { id: "Q5VXmY5RFMXX2uBZ", name: "Inventory Monitor", expected: "Mon+Fri 09:00 ET", schedule: { type: "dow", days: [1, 5], hour: 9, minute: 0 } },
  // v2 (2026-09-09) replaced the old random ~2×/day drift with ONE daily pass
  // that batches the whole fleet into a single gps/set call and never boots a
  // phone. Its trigger reads 04:20 but carries no settings.timezone, so — the
  // same trap as Failed-Post Reconcile above — it resolves against the n8n
  // instance default (Asia/Manila) and really fires at 20:20 UTC = 16:20 ET.
  // Tracked at the time it ACTUALLY runs, not the time the trigger reads.
  { id: "YJckzOo6hRchFnS1", name: "GPS Drift", expected: "daily 16:20 ET", schedule: { type: "daily", hour: 16, minute: 20 }, note: "n8n trigger unpinned (Asia/Manila) — shifts to 15:20 ET after Nov 1" },
  { id: "FknqQM7GNJJmViRP", name: "Proxy & Account Audit", expected: "biweekly Mon", schedule: { type: "none" } },
];

export type RunState =
  | "ok"
  | "failed"
  | "overdue"
  | "stale"
  | "running"
  | "pending"
  | "unknown"
  /** n8n itself could not be read. NOT the same as "this never ran". */
  | "unreachable";

/**
 * The workflow a real phone does not have (Garreth, 2026-09-22).
 *
 * The Posting Agent is what hands a cloud phone its post. On the Physical side
 * Yurie posts by hand off the To-do list, so it is not her automation and it is
 * left out of both the Physical dashboard card and the Physical Automation
 * page. Everything else still runs for both fleets and stays visible.
 *
 * Note for PF-06: the fork of this workflow will WRITE the Physical to-do rows
 * rather than call Geelark. When that lands, decide whether the forked
 * workflow earns its place back on this screen under its own name.
 */
export const POSTING_AGENT_ID = "lioNzkWRocyDvZS5";

/** Drop what does not apply to the fleet being looked at. */
export function workflowsForFleet<T extends { id: string }>(rows: T[], fleet: Fleet): T[] {
  return fleet === "physical" ? rows.filter((r) => r.id !== POSTING_AGENT_ID) : rows;
}

export interface WorkflowStatus {
  id: string;
  name: string;
  expected: string;
  note?: string;
  key: boolean;
  state: RunState;
  label: string;
  lastRunAt: string | null; // ISO
  lastRunLabel: string; // ET-formatted for display
  durationSec: number | null;
  executionUrl: string | null;
  // TODO: Supabase ground-truth column (scheduler_runs / geelark_tasks) —
  // wired once schemas are verified against the live database.
}

const GRACE_MIN = 30;

const ET = "America/New_York";

function etParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    dow: dows.indexOf(get("weekday")),
  };
}

export function formatEt(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  const today = etParts(new Date());
  const that = etParts(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  if (that.date === today.date) return time;
  const day = new Intl.DateTimeFormat("en-US", { timeZone: ET, month: "short", day: "numeric" }).format(d);
  return `${day} ${time}`;
}

function computeState(wf: TrackedWorkflow, exec: ExecutionRead, now: Date): { state: RunState; label: string } {
  // Answered before anything else: with no read there is no evidence, and every
  // rule below (overdue, stale, "No runs") would otherwise be inventing one.
  if (exec === UNREACHABLE) return { state: "unreachable", label: "Can't check" };
  if (exec && (exec.status === "running" || exec.status === "waiting" || !exec.finished)) {
    return { state: "running", label: "Running" };
  }
  const failed = exec && exec.status !== "success";
  const nowEt = etParts(now);
  const lastEt = exec ? etParts(new Date(exec.startedAt)) : null;
  const ranToday = lastEt?.date === nowEt.date;

  if (wf.schedule.type === "interval") {
    if (failed) return { state: "failed", label: "Failed" };
    if (!exec) return { state: "unknown", label: "No runs" };
    const ageMin = (now.getTime() - new Date(exec.startedAt).getTime()) / 60_000;
    if (ageMin > wf.schedule.minutes + GRACE_MIN) {
      return { state: "stale", label: `Stale ${Math.round(ageMin / 60)}h` };
    }
    return { state: "ok", label: "Ran" };
  }

  if (wf.schedule.type === "daily" || wf.schedule.type === "dow") {
    const dueToday = wf.schedule.type === "daily" || wf.schedule.days.includes(nowEt.dow);
    const dueBy = wf.schedule.hour * 60 + wf.schedule.minute + GRACE_MIN;
    if (dueToday && nowEt.minutes >= dueBy && !(ranToday && !failed)) {
      // A failed run today, or no run at all, past the expected time.
      return failed && ranToday
        ? { state: "failed", label: "Failed" }
        : { state: "overdue", label: "Overdue" };
    }
    if (failed && ranToday) return { state: "failed", label: "Failed" };
    if (dueToday && nowEt.minutes < dueBy && !ranToday) {
      return { state: "pending", label: "Not yet due" };
    }
    return exec ? { state: "ok", label: "Ran" } : { state: "unknown", label: "No runs" };
  }

  // schedule "none" — report the latest outcome only.
  if (failed) return { state: "failed", label: "Failed" };
  return exec ? { state: "ok", label: "Ran" } : { state: "unknown", label: "No runs" };
}

const getExecutions = makeExecutionsFetcher(TRACKED_WORKFLOWS.map((w) => w.id));

export async function getAutomationStatuses(): Promise<{
  rows: WorkflowStatus[];
  fetchedAt: string;
}> {
  const { data: executions, fetchedAt } = await getExecutions();
  const now = new Date();

  const rows = TRACKED_WORKFLOWS.map((wf) => {
    const read = executions[wf.id] ?? null;
    const { state, label } = computeState(wf, read, now);
    // Everything below wants the execution or nothing; an unreadable source has
    // no timestamps, no duration and no execution to link to.
    const exec = read === UNREACHABLE ? null : read;
    return {
      id: wf.id,
      name: wf.name,
      expected: wf.expected,
      note: wf.note,
      key: Boolean(wf.key),
      state,
      label,
      lastRunAt: exec?.startedAt ?? null,
      lastRunLabel: formatEt(exec?.startedAt ?? null),
      durationSec:
        exec?.stoppedAt && exec.startedAt
          ? Math.round((new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000)
          : null,
      executionUrl: exec
        ? `${process.env.N8N_BASE_URL}/workflow/${wf.id}/executions/${exec.id}`
        : null,
    };
  });

  return { rows, fetchedAt };
}
