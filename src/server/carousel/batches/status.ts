/** Pure domain projection. No database writes, provider calls or UI dependencies. */
export const DECK_STATES = [
  "pending", "writing", "written", "render_queued", "rendering", "rendered",
  "approved", "flagged", "failed", "dropped", "discarded",
] as const;
export type DeckState = typeof DECK_STATES[number];
/** Repository-derived readiness for the current deck version; never trust browser flags. */
export interface DeckProgress {
  id: string;
  state: DeckState;
  /** True only when ALL current-version writing/music/risk checks passed. */
  canRender: boolean;
  /** True only when ALL current-version render/readability checks passed. */
  canApprove: boolean;
}
export interface BatchProgress {
  id: string;
  /** Monotonic concurrency token; persistence must advance it on each batch mutation. */
  revision: number;
  requested: number;
  lifecycle: "open" | "stopped" | "finished";
  mode: "manual" | "auto";
  /** Creation provenance, independent of the current (switchable) mode. */
  madeInAuto: boolean;
  decks: readonly DeckProgress[];
}
export type BatchAction = "render" | "approve" | "stop" | "continue" | "finish" | "run_again" | "pause_auto" | "resume_auto";

/**
 * Derives display counts and candidate human actions from a complete batch snapshot.
 * Throws on inconsistent data instead of presenting a misleading success state.
 * This neither authenticates callers nor acquires a lock or persists transitions.
 */
export function projectBatch(batch: BatchProgress) {
  if (!batch.id || !Number.isSafeInteger(batch.revision) || batch.revision < 0 ||
      !Number.isInteger(batch.requested) || batch.requested < 1 || batch.requested > 50) {
    throw new Error("Invalid batch identity, revision or requested count");
  }
  if (!["open", "stopped", "finished"].includes(batch.lifecycle) ||
      !["manual", "auto"].includes(batch.mode)) throw new Error("Invalid batch lifecycle or mode");
  const counts = Object.fromEntries(DECK_STATES.map(s => [s, 0])) as Record<DeckState, number>;
  const ids = new Set<string>();
  for (const deck of batch.decks) {
    if (!deck.id || ids.has(deck.id) || !DECK_STATES.includes(deck.state)) {
      throw new Error("Invalid or duplicate deck");
    }
    if ((deck.canRender && deck.state !== "written") || (deck.canApprove && deck.state !== "rendered")) {
      throw new Error("Readiness does not match deck state");
    }
    ids.add(deck.id);
    counts[deck.state]++;
  }
  if (ids.size > batch.requested) throw new Error("More decks than requested");
  // Missing deck rows still count as work: saving 5 of 50 must not imply completion.
  const unaccounted = batch.requested - ids.size;
  const toRender = batch.decks.filter(d => d.state === "written" && d.canRender).length;
  const toApprove = batch.decks.filter(d => d.state === "rendered" && d.canApprove).length;
  const blocked = counts.flagged + counts.failed + counts.written - toRender + counts.rendered - toApprove;
  // Failures require resolution; only approved or explicitly dropped/discarded decks
  // are settled. Settled does not itself mean the batch has been explicitly finished.
  const outstanding = unaccounted + counts.pending + counts.writing + counts.written +
    counts.render_queued + counts.rendering + counts.rendered + counts.flagged + counts.failed;
  if (batch.lifecycle === "finished" && outstanding > 0) {
    throw new Error("Finished batch still has unaccounted or outstanding decks");
  }
  const writingRemaining = unaccounted + counts.pending + counts.writing;
  const renderingRemaining = counts.render_queued + counts.rendering;
  const successfulWritten = counts.written + counts.render_queued + counts.rendering + counts.rendered + counts.approved;
  const successfulRendered = counts.rendered + counts.approved;
  let status: "stopped" | "done" | "writing" | "rendering" | "needs_attention" | "to_render" | "to_approve" | "awaiting_finish";
  let label: string;
  // Active work takes label priority. Keep exposing blocked counts alongside it so
  // clients do not interpret a writing/rendering label as proof that every deck is healthy.
  if (batch.lifecycle === "stopped") { status = "stopped"; label = "Stopped"; }
  else if (batch.lifecycle === "finished") { status = "done"; label = "Done"; }
  else if (writingRemaining > 0) { status = "writing"; label = `Writing ${successfulWritten} of ${batch.requested}`; }
  else if (renderingRemaining > 0) { status = "rendering"; label = `Rendering ${successfulRendered} of ${successfulRendered + renderingRemaining}`; }
  else if (toRender > 0) { status = "to_render"; label = `${toRender} to render`; }
  else if (toApprove > 0) { status = "to_approve"; label = `${toApprove} to approve`; }
  else if (blocked > 0) { status = "needs_attention"; label = `${blocked} need attention`; }
  else { status = "awaiting_finish"; label = "Ready to finish"; }

  const actions: BatchAction[] = [];
  if (batch.lifecycle === "finished") actions.push("run_again");
  else if (batch.lifecycle === "stopped") {
    // A stop request cannot discard an in-flight write/render. A later finish handler
    // must settle remaining decks transactionally before persisting lifecycle=finished.
    if (!counts.writing && !counts.rendering) actions.push("continue", "finish");
  } else {
    actions.push("stop");
    actions.push(batch.mode === "auto" ? "pause_auto" : "resume_auto");
    if (!writingRemaining && !renderingRemaining) {
      if (toRender && batch.mode === "manual") actions.push("render");
      // This action is for a human command handler, NEVER the Auto worker.
      if (toApprove) actions.push("approve");
      if (!outstanding) actions.push("finish");
    }
  }
  return { batchId: batch.id, revision: batch.revision, status, label, counts,
    unaccounted, toRender, toApprove, blocked, successfulWritten, successfulRendered,
    madeInAuto: batch.madeInAuto, mode: batch.mode, actions,
    // D1/D12: waiting for review or final approval is not active generation.
    // A stopped runner retains its slot until explicitly continued/finished.
    // Persistence must enforce the matching constraint under a lane lock; this
    // read model alone does not prevent concurrent batch creation.
    occupiesTypeSlot: batch.lifecycle === "stopped" ||
      (batch.lifecycle === "open" && (writingRemaining > 0 || renderingRemaining > 0)) };
}

/** Presentation capabilities are not authorization. Every command must recheck. */
export function permittedActions(batch: BatchProgress, actorId: string, ownerId: string) {
  return actorId && actorId === ownerId ? projectBatch(batch).actions : [];
}
