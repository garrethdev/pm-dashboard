/**
 * The batch runner (DEV-11, DEV-12, DEV-48, DEV-49): writes a batch deck by
 * deck, runs the gate and the music lookup on each, and in Auto carries on
 * to rendering and to the finished batch without a press.
 *
 * Where it runs: inside the app's own process, kicked off by the route that
 * created or continued the batch and left running after the response. One
 * loop per batch, never two (the in-memory claim below; a second claim is a
 * no-op). If the process dies mid-deck the batch is left resumable: nothing
 * moves for 60 seconds, the screens read Stopped, and Continue starts the
 * loop again from the next unwritten deck. On a serverless host that ends
 * the function early the same rule applies, which is DEV-48's open
 * question about where the worker lives, not solved here.
 *
 * Auto never approves. It stops at the finished batch, which waits for
 * Approve (n) decks.
 */
import {
  claimDeck,
  countDecks,
  currentDecks,
  getBatch,
  listDraftRows,
  newDeckVersion,
  patchDeck,
  replaceSlides,
  toDeck,
  touchBatch,
  type DraftRow,
} from "@/server/carousel/repo/batches";
import { listAssets } from "@/server/carousel/repo/libraries";
import { getTemplateRecord, getTemplateVersion } from "@/server/carousel/repo/templates";
import { getWritingVersion } from "@/server/carousel/repo/writing";
import type { Batch } from "@/server/carousel/repo/types";
import { gateDeck } from "@/server/carousel/services/gate";
import { lookupTrack } from "@/server/carousel/services/music";
import { notifyBatchFinished, notifyBatchWritten } from "@/server/carousel/services/notify";
import { paintDeck, type PaintTemplate } from "@/server/carousel/services/painter";
import { settledRoles, writeDeck, type CopyRole } from "@/server/carousel/services/writer";
import { batchWords } from "@/server/carousel/status-words";

const MAX_TRIES = 3;

type Loops = Map<string, Promise<void>>;
const g = globalThis as unknown as { __carouselLoops?: Loops };
const loops: Loops = g.__carouselLoops ?? (g.__carouselLoops = new Map());

export function loopRunning(batchId: string): boolean {
  return loops.has(batchId);
}

/** Start the loop for a batch if it is not already running. */
export function ensureLoop(batchId: string): void {
  if (loops.has(batchId)) return;
  const p = run(batchId)
    .catch((err) => console.error(`carousel batch ${batchId} loop failed`, err))
    .finally(() => loops.delete(batchId));
  loops.set(batchId, p);
}

interface Context {
  batch: Batch;
  template: PaintTemplate;
  contract: CopyRole[];
  writing: string | null;
  pillar: string | null;
}

async function context(batchId: string): Promise<Context | null> {
  const batch = await getBatch(batchId);
  if (!batch) return null;
  let template: Record<string, unknown> | null = null;
  if (batch.templateId) {
    template = batch.templateVersion ? await getTemplateVersion(batch.templateId, batch.templateVersion) : null;
    if (!template) template = (await getTemplateRecord(batch.templateId))?.template ?? null;
  }
  if (!template) throw new Error("The batch has no template");
  const writing = batch.writingVersionId ? (await getWritingVersion(batch.writingVersionId))?.body ?? null : null;
  const lane = template.lane as { set_on_materialise?: { pillar?: string } } | null | undefined;
  return {
    batch,
    template: template as unknown as PaintTemplate,
    contract: (template.copy_contract as CopyRole[]) ?? [],
    writing,
    pillar: lane?.set_on_materialise?.pillar ?? null,
  };
}

async function fresh(batchId: string): Promise<Batch> {
  const b = await getBatch(batchId);
  if (!b) throw new Error("Batch vanished");
  return b;
}

/** Write one deck: claim, write, gate, music, land. Returns whether it landed clean. */
async function writeOne(ctx: Context, row: DraftRow, feedback: string | null): Promise<void> {
  const claimed = await claimDeck(row.id, ["pending", "flagged", "failed"], "writing", { last_error: null });
  if (!claimed) return;
  await touchBatch(ctx.batch.id);
  const batch = await fresh(ctx.batch.id);
  const others = batch.decks.filter((d) => d.id !== row.id && d.hook && d.state !== "discarded").map((d) => d.hook!);
  try {
    const result = await writeDeck({
      typeName: batch.typeName,
      character: batch.character,
      slug: ctx.template.slug,
      contract: ctx.contract,
      writing: ctx.writing,
      note: batch.note,
      perBatchText: batch.perBatchText,
      feedback,
      avoidHooks: others,
      position: row.position ?? 0,
      seed: `${row.id}:${row.version}:${row.auto_tries}`,
    });
    const copy = { ...settledRoles(ctx.contract, batch.perBatchText), ...result.copy };
    const gate = gateDeck(copy, ctx.contract, result.hook, others);
    const music = await lookupTrack(result.musicHint, row.id, ctx.pillar).catch(() => ({ music: result.musicHint ?? "", status: "not_found" as const }));
    const flagged = gate.flagged || music.status === "not_found";
    await patchDeck(row.id, {
      status: flagged ? "flagged" : "written",
      hook: result.hook,
      caption: result.caption,
      copy,
      music: music.music || null,
      music_status: music.status,
      score: gate.score,
      flag_kind: gate.flagged ? gate.kind : music.status === "not_found" ? "music" : null,
      flag_reason: gate.flagged ? gate.reason : music.status === "not_found" ? "Track not found" : null,
      feedback: gate.flagged ? gate.fix : null,
      generation_metadata: { writer: result.writer, model: result.model, gate },
    });
  } catch (err) {
    await patchDeck(row.id, { status: "failed", last_error: err instanceof Error ? err.message : "Writing failed" });
  }
  await touchBatch(ctx.batch.id);
}

async function renderOne(ctx: Context, row: DraftRow, assets: Awaited<ReturnType<typeof listAssets>>): Promise<void> {
  const claimed = await claimDeck(row.id, ["written", "render_queued", "rendered"], "rendering", { render_claimed_at: new Date().toISOString() });
  if (!claimed) return;
  await touchBatch(ctx.batch.id);
  try {
    if (!ctx.batch.libraryId) throw new Error("The batch has no image library");
    const copy = (claimed.copy ?? {}) as Record<string, string>;
    const slides = paintDeck(ctx.template, assets, ctx.batch.libraryId, `${row.id}:${row.version}`, copy);
    await replaceSlides(
      row.id,
      slides.map((s) => ({ position: s.position, box_copy: s.boxCopy, image_ids: s.imageIds, image_url: s.imageUrls[0] ?? null, rendered_svg: s.svg })),
    );
    await patchDeck(row.id, { status: "rendered", rendered_at: new Date().toISOString(), render_manifest: { slides: slides.map((s) => ({ n: s.position, images: s.imageIds })) } });
  } catch (err) {
    await patchDeck(row.id, { status: "failed", last_error: err instanceof Error ? err.message : "Rendering failed" });
  }
  await touchBatch(ctx.batch.id);
}

/** The loop itself: keeps going while the batch is open and has work. */
async function run(batchId: string): Promise<void> {
  const ctx = await context(batchId);
  if (!ctx) return;
  let assets: Awaited<ReturnType<typeof listAssets>> | null = null;

  for (let guard = 0; guard < 500; guard++) {
    const batch = await fresh(batchId);
    if (batch.lifecycle !== "open") return;
    const rows = currentDecks(await listDraftRows([batchId]));
    const auto = batch.mode === "auto";

    // 1. Anything still to write.
    const pending = rows.find((r) => r.status === "pending");
    if (pending) {
      await writeOne({ ...ctx, batch }, pending, null);
      continue;
    }
    // 2. In Auto, a flagged deck gets another go, three tries in all.
    if (auto) {
      const retry = rows.find((r) => r.status === "flagged" && (r.auto_tries ?? 1) < MAX_TRIES);
      if (retry) {
        await patchDeck(retry.id, { auto_tries: (retry.auto_tries ?? 1) + 1 });
        await writeOne({ ...ctx, batch }, { ...retry, auto_tries: (retry.auto_tries ?? 1) + 1 }, retry.feedback ?? retry.flag_reason);
        continue;
      }
      const dropped = rows.filter((r) => r.status === "flagged" && (r.auto_tries ?? 1) >= MAX_TRIES);
      for (const d of dropped) await patchDeck(d.id, { status: "dropped" });
      if (dropped.length) {
        await touchBatch(batchId);
        continue;
      }
    }
    // 3. Writing is done. Manual waits for Render; Auto renders by itself.
    const stillWriting = rows.some((r) => r.status === "writing");
    if (stillWriting) return; // another claim holds it; nothing more for this loop
    const toRender = rows.filter((r) => r.status === "render_queued" || (auto && r.status === "written"));
    if (toRender.length) {
      if (!batch.renderRequestedAt) await touchBatch(batchId, { status: "rendering", render_requested_at: new Date().toISOString() });
      assets = assets ?? (batch.libraryId ? await listAssets(batch.libraryId) : []);
      await renderOne({ ...ctx, batch }, toRender[0], assets);
      continue;
    }
    // 4. Nothing left to do: settle the batch's phase and ring the bell once.
    const decks = rows.map((r) => toDeck(r));
    const counts = countDecks(batch.requested, decks);
    const summary = { ...batch, counts };
    const words = batchWords(summary);
    if (batch.phase === "generating" && words.stage === "to_render") {
      await touchBatch(batchId, { status: "in_review" });
      await notifyBatchWritten(summary);
    } else if (batch.phase === "rendering" && words.stage === "to_approve") {
      await touchBatch(batchId, { status: "in_review" });
      await notifyBatchFinished(summary);
    } else if (batch.phase !== "in_review") {
      await touchBatch(batchId, { status: "in_review" });
    }
    return;
  }
}

/** Regenerate one deck with feedback: a new version at the same position, written now. */
export async function regenerateDeck(batchId: string, deckId: string, feedback: string | null): Promise<void> {
  const ctx = await context(batchId);
  if (!ctx) throw new Error("Batch not found");
  const rows = await listDraftRows([batchId]);
  const prev = rows.find((r) => r.id === deckId);
  if (!prev) throw new Error("Deck not found");
  await patchDeck(prev.id, { status: "discarded" });
  const next = await newDeckVersion(prev, { feedback, auto_tries: 1 });
  await touchBatch(batchId);
  const batch = await fresh(batchId);
  await writeOne({ ...ctx, batch }, next, feedback ?? prev.flag_reason);
  ensureLoop(batchId);
}

/** Regenerate every flagged or dropped deck, with one note for all of them. */
export async function regenerateFlagged(batchId: string, feedback: string | null): Promise<number> {
  const rows = currentDecks(await listDraftRows([batchId])).filter((r) => r.status === "flagged" || r.status === "dropped");
  for (const r of rows) {
    await patchDeck(r.id, { status: "discarded" });
    await newDeckVersion(r, { feedback, auto_tries: 1 });
  }
  await touchBatch(batchId, { status: "generating" });
  ensureLoop(batchId);
  return rows.length;
}

export async function retryDeck(batchId: string, deckId: string): Promise<void> {
  await patchDeck(deckId, { status: "pending", last_error: null });
  await touchBatch(batchId, { status: "generating" });
  ensureLoop(batchId);
}

/** Render (n) decks: queue every clean written deck and let the loop paint them. */
export async function renderBatch(batchId: string): Promise<number> {
  const rows = currentDecks(await listDraftRows([batchId])).filter((r) => r.status === "written");
  for (const r of rows) await patchDeck(r.id, { status: "render_queued" });
  await touchBatch(batchId, { status: "rendering", render_requested_at: new Date().toISOString() });
  ensureLoop(batchId);
  return rows.length;
}

/** Approve (n) decks: the only approval in the app. Auto never calls this. */
export async function approveBatch(batchId: string, by: string): Promise<number> {
  const rows = currentDecks(await listDraftRows([batchId])).filter((r) => r.status === "rendered");
  const now = new Date().toISOString();
  for (const r of rows) await patchDeck(r.id, { status: "approved", human_approved: true, approved_at: now, approved_by: by });
  await touchBatch(batchId, { status: "finished", approved_at: now, finished_at: now });
  return rows.length;
}

export async function stopBatch(batchId: string): Promise<void> {
  await touchBatch(batchId, { status: "stopped" });
}

export async function continueBatch(batchId: string): Promise<void> {
  const rows = currentDecks(await listDraftRows([batchId]));
  // A deck the dead worker left mid-way goes back to the queue it came from.
  for (const r of rows) {
    if (r.status === "writing") await patchDeck(r.id, { status: "pending" });
    if (r.status === "rendering") await patchDeck(r.id, { status: "render_queued" });
  }
  const anyWriting = rows.some((r) => r.status === "pending" || r.status === "writing");
  await touchBatch(batchId, { status: anyWriting ? "generating" : "rendering" });
  ensureLoop(batchId);
}

export async function finishBatch(batchId: string): Promise<void> {
  await touchBatch(batchId, { status: "finished", finished_at: new Date().toISOString() });
}

export async function setAutoMode(batchId: string, auto: boolean): Promise<void> {
  await touchBatch(batchId, { mode: auto ? "auto" : "manual" });
  if (auto) ensureLoop(batchId);
}

export async function discardDeck(batchId: string, deckId: string): Promise<void> {
  await patchDeck(deckId, { status: "discarded" });
  await touchBatch(batchId);
}

export async function changeTrack(batchId: string, deckId: string, track: string): Promise<void> {
  const row = (await listDraftRows([batchId])).find((r) => r.id === deckId);
  if (!row) throw new Error("Deck not found");
  const wasMusicFlag = row.status === "flagged" && row.flag_kind === "music";
  await patchDeck(deckId, {
    music: track,
    music_status: "found",
    ...(wasMusicFlag ? { status: "written", flag_kind: null, flag_reason: null } : {}),
  });
  await touchBatch(batchId);
}

/** A batch whose loop should be alive but is not (server restarted): restart it. */
export async function reviveIfNeeded(batch: Batch): Promise<void> {
  if (batch.lifecycle !== "open" || loopRunning(batch.id)) return;
  const w = batchWords(batch);
  if (w.stage === "writing" || w.stage === "rendering") ensureLoop(batch.id);
}
