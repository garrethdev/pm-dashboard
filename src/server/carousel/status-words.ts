/**
 * DEV-61: what a batch is waiting for, worked out in one place.
 *
 * Every screen that names a batch's state (Carousel types, the type page,
 * History, Overview's Running Tasks, the batch page itself) reads these words
 * and never derives its own. The rules are D12's, as Garreth settled them on
 * 2026-09-21:
 *
 * - Stopped: the batch's lifecycle is stopped, or it is meant to be working
 *   and nothing has moved for 60 seconds (the dead-worker rule from DEV-11).
 * - Writing n of N while any deck is still to be written.
 * - Rendering n of M while any deck is queued or rendering.
 * - "(n) to render" when the writing is done, nothing has been rendered, and
 *   the batch is not in Auto (Auto renders by itself).
 * - "(n) to approve" when something is rendered and nothing has been
 *   approved. A blank and a nought mean the same thing for the status.
 * - Done otherwise; "(n) flagged" is what a finished batch says once nothing
 *   is waiting on it.
 */
import type { BatchSummary } from "@/server/carousel/repo/types";

export const STALL_AFTER_MS = 60_000;

export type BatchStage = "writing" | "rendering" | "to_render" | "to_approve" | "flagged" | "stopped" | "done";

export interface BatchWords {
  stage: BatchStage;
  /** The words on the pill or the card. */
  label: string;
  /** Pill tones: neutral, accent (working), danger (Stopped). */
  tone: "neutral" | "accent" | "danger";
  /** Whether a person is being asked for a press. */
  needsPerson: boolean;
  /** Whether the batch holds the type's one running slot. */
  running: boolean;
  /** Whether the batch looks alive but has not moved for a minute. */
  stalled: boolean;
  /** The screen that holds the press. */
  href: string;
  /** How far along, 0 to 1, for a working batch. */
  progress: number | null;
  /** "2 dropped", "1 flagged": what sits beside the main words. */
  aside: string | null;
}

export function batchWords(b: BatchSummary, now = Date.now()): BatchWords {
  const c = b.counts;
  const href = `/carousel-generator/batches/${b.id}`;
  const unaccounted = Math.max(0, b.requested - c.decks);
  const writingLeft = unaccounted + c.pending + c.writing;
  const renderingLeft = c.rendering;
  const dropped = c.dropped > 0 ? `${c.dropped} dropped` : null;
  const flagged = c.flagged > 0 ? `${c.flagged} flagged` : null;
  const aside = dropped && flagged ? `${flagged} · ${dropped}` : (dropped ?? flagged);
  const working = b.lifecycle === "open" && (writingLeft > 0 || renderingLeft > 0);
  const stalled = working && now - Date.parse(b.lastMovementAt) > STALL_AFTER_MS;
  const base = { href, aside, stalled };

  if (b.lifecycle === "stopped" || stalled) {
    return { ...base, stage: "stopped", label: "Stopped", tone: "danger", needsPerson: true, running: true, progress: null };
  }
  if (b.lifecycle === "finished") {
    return { ...base, stage: "done", label: "Done", tone: "neutral", needsPerson: false, running: false, progress: null };
  }
  if (writingLeft > 0) {
    const total = Math.max(1, b.requested - c.dropped - c.discarded);
    return {
      ...base,
      stage: "writing",
      label: `Writing ${c.written} of ${total}`,
      tone: "accent",
      needsPerson: false,
      running: true,
      progress: c.written / total,
    };
  }
  if (renderingLeft > 0) {
    const total = Math.max(1, c.rendered + renderingLeft);
    return {
      ...base,
      stage: "rendering",
      label: `Rendering ${c.rendered} of ${total}`,
      tone: "accent",
      needsPerson: false,
      running: true,
      progress: c.rendered / total,
    };
  }
  const toRender = c.written - c.rendered;
  if (toRender > 0 && c.rendered === 0 && b.mode !== "auto") {
    return { ...base, stage: "to_render", label: `${toRender} to render`, tone: "neutral", needsPerson: true, running: false, progress: null };
  }
  if (c.rendered > 0 && c.approved === 0) {
    return { ...base, stage: "to_approve", label: `${c.rendered} to approve`, tone: "neutral", needsPerson: true, running: false, progress: null };
  }
  if (c.flagged > 0 && c.written === 0) {
    return { ...base, stage: "flagged", label: `${c.flagged} flagged`, tone: "neutral", needsPerson: true, running: false, progress: null, aside: dropped };
  }
  if (toRender > 0 && b.mode === "auto") {
    // Auto with decks written and nothing queued: the worker is between steps.
    return { ...base, stage: "rendering", label: `Rendering ${c.rendered} of ${c.written}`, tone: "accent", needsPerson: false, running: true, progress: c.rendered / Math.max(1, c.written) };
  }
  return { ...base, stage: "done", label: "Done", tone: "neutral", needsPerson: false, running: false, progress: null };
}

/**
 * How often a screen that lists batches should re-read, in milliseconds:
 * `ms` while one is writing or rendering, null otherwise. Stopped, Done and
 * "to approve" only change when a person presses something, so a screen
 * showing only those has nothing to poll for (Garreth, 2026-09-26).
 */
export function whileMoving(batches: BatchSummary[] | undefined, ms = 5000, now = Date.now()): number | null {
  const moving = batches?.some((b) => b.lifecycle === "open" && ["writing", "rendering"].includes(batchWords(b, now).stage));
  return moving ? ms : null;
}
