/**
 * The bell's two Carousel Generator kinds (DEV-52): Batch written, for a
 * manual batch waiting for Render (n) decks, and Batch finished, for any
 * batch waiting for Approve (n) decks. Raised by the server, never the page.
 * A flagged deck in Auto raises nothing.
 */
import { insertNotification } from "@/lib/data/notifications";
import type { BatchSummary } from "@/server/carousel/repo/types";

export async function notifyBatchWritten(b: BatchSummary): Promise<void> {
  const toRender = b.counts.written;
  const flagged = b.counts.flagged;
  await insertNotification({
    type: "carousel_batch_written",
    severity: "info",
    title: "Batch written",
    body: `${b.typeName} · ${toRender} to render${flagged ? `, ${flagged} flagged` : ""}`,
    target: b.id,
    meta: { batchId: b.id, href: `/carousel-generator/batches/${b.id}` },
  }).catch((err) => console.error("carousel notify failed", err));
}

export async function notifyBatchFinished(b: BatchSummary): Promise<void> {
  const parts = [`${b.counts.rendered} rendered`];
  if (b.counts.dropped) parts.push(`${b.counts.dropped} dropped`);
  if (b.counts.flagged) parts.push(`${b.counts.flagged} flagged`);
  await insertNotification({
    type: "carousel_batch_finished",
    severity: "info",
    title: "Batch finished",
    body: `${b.typeName} · ${parts.join(", ")}`,
    target: b.id,
    meta: { batchId: b.id, href: `/carousel-generator/batches/${b.id}` },
  }).catch((err) => console.error("carousel notify failed", err));
}
