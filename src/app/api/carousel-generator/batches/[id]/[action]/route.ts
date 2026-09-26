import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { getBatch } from "@/server/carousel/repo/batches";
import {
  approveBatch,
  continueBatch,
  finishBatch,
  regenerateFlagged,
  renderBatch,
  setAutoMode,
  stopBatch,
} from "@/server/carousel/services/runner";
import { batchWords } from "@/server/carousel/status-words";

const ACTIONS = new Set(["render", "approve", "stop", "continue", "finish", "pause-auto", "resume-auto", "regenerate-flagged"]);

/**
 * The batch's presses. Every one rechecks the batch's state on the server:
 * Render only when the writing is done and nothing is rendered, Approve only
 * when something is rendered, Continue only on a stopped batch.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id, action } = await params;
  if (!ACTIONS.has(action)) return bad("Unknown action", 404);
  const batch = await getBatch(id);
  if (!batch) return bad("Batch not found", 404);
  const words = batchWords(batch);
  const b = await body(req);
  if (typeof b.revision === "number" && b.revision !== batch.revision) return bad("The batch changed. Refresh before trying again", 409, "STALE_BATCH");

  switch (action) {
    case "render":
      if (words.stage !== "to_render") return bad("The batch is not ready to render", 409);
      return attempt(g.email, "carousel.batch.render", id, () => renderBatch(id).then((n) => ({ queued: n })));
    case "approve":
      if (batch.counts.rendered === 0 || batch.lifecycle !== "open") return bad("Nothing is rendered yet", 409);
      return attempt(g.email, "carousel.batch.approve", id, () => approveBatch(id, g.email).then((n) => ({ approved: n })));
    case "stop":
      if (batch.lifecycle !== "open") return bad("The batch is not running", 409);
      return attempt(g.email, "carousel.batch.stop", id, () => stopBatch(id));
    case "continue":
      if (words.stage !== "stopped") return bad("The batch is not stopped", 409);
      return attempt(g.email, "carousel.batch.continue", id, () => continueBatch(id));
    case "finish":
      if (batch.lifecycle === "finished") return bad("Already finished", 409);
      return attempt(g.email, "carousel.batch.finish", id, () => finishBatch(id));
    case "pause-auto":
      if (batch.mode !== "auto" || batch.lifecycle !== "open") return bad("The batch is not in Auto", 409);
      return attempt(g.email, "carousel.batch.pause_auto", id, () => setAutoMode(id, false));
    case "resume-auto":
      if (batch.mode === "auto" || batch.lifecycle !== "open") return bad("The batch is already in Auto", 409);
      return attempt(g.email, "carousel.batch.resume_auto", id, () => setAutoMode(id, true));
    case "regenerate-flagged":
      return attempt(g.email, "carousel.batch.regenerate_flagged", id, () => regenerateFlagged(id, str(b.feedback) || null).then((n) => ({ regenerated: n })));
  }
  return bad("Unknown action", 404);
}

export const dynamic = "force-dynamic";
