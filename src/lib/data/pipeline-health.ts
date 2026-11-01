import { sbRest } from "@/lib/data/supabase";
import { categoryLabel } from "@/lib/data/notification-copy";
import type { NotificationItem } from "@/lib/data/notifications";

/**
 * Is the carousel analysis pipeline still moving? (2026-10-31.)
 *
 * On 2026-10-09 the model the reader used was retired and nothing was
 * analysed for three weeks. The dashboard said nothing, because nothing in it
 * looked at whether new analyses were still arriving. This is that look.
 *
 * Three ways it goes quiet, each its own check:
 *  - STALLED: work is waiting but no analysis has been written for 6 hours.
 *    Idle with an empty queue is fine and does not fire.
 *  - STUCK: a job has been marked running for over an hour. A healthy run
 *    takes minutes.
 *  - FAILING: most of the last day's finished image jobs failed. Video jobs
 *    are left out of this count: they fail on expired TikTok links today (a
 *    known open problem, BACKLOG) and would keep it red permanently.
 */

export const STALL_HOURS = 6;
export const STUCK_HOURS = 1;
export const FAIL_MIN_JOBS = 10;
export const FAIL_RATE = 0.5;

export interface PipelineFacts {
  /** When the newest reference_analysis row was written, or null if none. */
  newestAnalysisAt: string | null;
  /** Jobs waiting to run (queued or due a retry). */
  waiting: number;
  /** Oldest lock among jobs marked running, or null. */
  oldestRunningSince: string | null;
  /** Finished non-video jobs in the last 24 hours. */
  finished24h: number;
  failed24h: number;
}

const hoursSince = (iso: string, now: Date) => (now.getTime() - new Date(iso).getTime()) / 3_600_000;

export function pipelineItems(f: PipelineFacts, now: Date = new Date()): NotificationItem[] {
  const out: NotificationItem[] = [];
  const base = {
    target: null,
    href: "/trends",
    read: false,
    severity: "critical" as const,
  };

  const idleHours = f.newestAnalysisAt ? hoursSince(f.newestAnalysisAt, now) : Infinity;
  if (f.waiting > 0 && idleHours >= STALL_HOURS) {
    const since = f.newestAnalysisAt ? `The last one was ${Math.floor(idleHours)} hours ago` : "None has ever been written";
    // Keyed on the last analysis: dismissing holds for the whole stall, and a
    // later stall after a recovery arrives as a new item.
    const key = `pipeline_stalled:${f.newestAnalysisAt ?? "never"}`;
    out.push({
      ...base,
      id: key,
      markKeys: [key],
      type: "pipeline_stalled",
      category: categoryLabel("pipeline_stalled"),
      title: "Carousel analysis has stopped",
      body: `${f.waiting} jobs are waiting and nothing has been analysed. ${since}`,
      at: f.newestAnalysisAt ?? now.toISOString(),
    });
  }

  if (f.oldestRunningSince && hoursSince(f.oldestRunningSince, now) >= STUCK_HOURS) {
    const key = `pipeline_stuck:${f.oldestRunningSince}`;
    out.push({
      ...base,
      severity: "warning",
      id: key,
      markKeys: [key],
      type: "pipeline_stuck",
      category: categoryLabel("pipeline_stuck"),
      title: "An analysis job is stuck",
      body: `One has been running for ${Math.floor(hoursSince(f.oldestRunningSince, now))} hours. A normal run takes minutes`,
      at: f.oldestRunningSince,
    });
  }

  if (f.finished24h >= FAIL_MIN_JOBS && f.failed24h / f.finished24h >= FAIL_RATE) {
    // One key per day so a day's dismissal does not hide tomorrow's.
    const key = `pipeline_failing:${now.toISOString().slice(0, 10)}`;
    out.push({
      ...base,
      id: key,
      markKeys: [key],
      type: "pipeline_failing",
      category: categoryLabel("pipeline_failing"),
      title: "Most analysis jobs are failing",
      body: `${f.failed24h} of ${f.finished24h} finished in the last day failed`,
      at: now.toISOString(),
    });
  }
  return out;
}

export async function getPipelineFacts(now: Date = new Date()): Promise<PipelineFacts> {
  const since = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const [newest, waiting, running, finished] = await Promise.all([
    sbRest<{ created_at: string }[]>("reference_analysis?select=created_at&order=created_at.desc&limit=1"),
    sbRest<{ id: number }[]>("content_pipeline_jobs?select=id&state=in.(queued,retry)&limit=1000"),
    sbRest<{ locked_at: string }[]>(
      "content_pipeline_jobs?select=locked_at&state=eq.running&order=locked_at.asc&limit=1",
    ),
    sbRest<{ state: string }[]>(
      `content_pipeline_jobs?select=state&state=in.(succeeded,failed)&job_type=neq.video_analyze&updated_at=gte.${since}&limit=1000`,
    ),
  ]);
  return {
    newestAnalysisAt: newest[0]?.created_at ?? null,
    waiting: waiting.length,
    oldestRunningSince: running[0]?.locked_at ?? null,
    finished24h: finished.length,
    failed24h: finished.filter((j) => j.state === "failed").length,
  };
}

export async function pipelineNotifications(): Promise<NotificationItem[]> {
  return pipelineItems(await getPipelineFacts());
}
