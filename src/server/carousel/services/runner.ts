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
 *
 * Two rules added after the PR #31 review (2026-09-29):
 *
 * One running batch per type, and the rest wait their turn. Every press
 * that starts work (Render, Continue, Regenerate, Retry) first takes the
 * type's one running slot. If another batch holds it, this batch is marked
 * Waiting with its decks queued, and is started when the holder finishes,
 * stops or is found dead.
 *
 * The loop never writes over a person's press. It waits on the writer and
 * the painter for many seconds at a time; every write after such a wait is
 * conditional on the deck or the batch still being in the state the loop
 * left it in, so a Discard or a Stop pressed meanwhile stays pressed.
 */
import {
  claimDeck,
  countDecks,
  currentDecks,
  getBatch,
  getDeckRow,
  listBriefsIn,
  listDraftRows,
  newDeckVersion,
  patchDeck,
  replaceSlides,
  toDeck,
  touchBatch,
  touchBatchIf,
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
import { STALL_AFTER_MS, batchWords } from "@/server/carousel/status-words";
import { fallback, logError } from "@/server/carousel/log";

const MAX_TRIES = 3;
const RUNNING = ["generating", "rendering"];
const LANE_INDEX = "carousel_briefs_one_running_per_lane";
const laneTaken = (err: unknown) => err instanceof Error && err.message.includes(LANE_INDEX);

type Loops = Map<string, Promise<void>>;
const g = globalThis as unknown as { __carouselLoops?: Loops };
const loops: Loops = g.__carouselLoops ?? (g.__carouselLoops = new Map());

function loopRunning(batchId: string): boolean {
  return loops.has(batchId);
}

/** Start the loop for a batch if it is not already running. */
export function ensureLoop(batchId: string): void {
  if (loops.has(batchId)) return;
  const p = run(batchId)
    .catch(async (err) => {
      logError(`batch ${batchId} loop`, err);
      await touchBatchIf(batchId, RUNNING, { status: "stopped" }).catch((e) => logError(`batch ${batchId} stop after crash`, e));
    })
    .finally(async () => {
      loops.delete(batchId);
      // The slot is free or about to be: let the next waiting batch of this type in.
      const batch = await getBatch(batchId).catch(fallback(`batch ${batchId} read after loop`, null));
      if (batch) await advanceQueue(batch.typeId).catch((e) => logError(`queue for ${batch.typeId}`, e));
    });
  loops.set(batchId, p);
}

/** What a batch's decks ask of the runner: writing, rendering, or nothing. */
function wanted(rows: DraftRow[], auto: boolean): "generating" | "rendering" | null {
  if (rows.some((r) => r.status === "pending" || r.status === "writing")) return "generating";
  if (auto && rows.some((r) => r.status === "flagged" && (r.auto_tries ?? 1) < MAX_TRIES)) return "generating";
  if (rows.some((r) => r.status === "render_queued" || r.status === "rendering" || (auto && r.status === "written"))) return "rendering";
  return null;
}

/**
 * A batch that holds its type's slot but has not moved for a minute and has
 * no loop here is the batch the screens already call Stopped. Say so in the
 * database too, so it stops holding the slot.
 */
async function releaseDeadHolders(typeId: string): Promise<void> {
  const holders = await listBriefsIn(typeId, RUNNING);
  for (const h of holders) {
    const quietFor = Date.now() - Date.parse(h.last_movement_at ?? h.updated_at);
    if (!loopRunning(h.id) && quietFor > STALL_AFTER_MS) await touchBatchIf(h.id, RUNNING, { status: "stopped" });
  }
}

/** Take the type's one running slot for this batch, or mark it Waiting. */
async function takeSlot(batchId: string, typeId: string, phase: "generating" | "rendering", extra: Record<string, unknown> = {}): Promise<"started" | "waiting"> {
  await releaseDeadHolders(typeId);
  try {
    await touchBatch(batchId, { status: phase, ...extra });
    return "started";
  } catch (err) {
    if (!laneTaken(err)) throw err;
    await touchBatch(batchId, { status: "waiting", ...extra });
    return "waiting";
  }
}

/** Start the oldest waiting batch of a type if the slot is free. Safe to call at any time. */
export async function advanceQueue(typeId: string): Promise<void> {
  if (!typeId) return;
  const waiting = await listBriefsIn(typeId, ["waiting"]);
  if (!waiting.length) return;
  await releaseDeadHolders(typeId);
  for (const w of waiting) {
    const rows = currentDecks(await listDraftRows([w.id]));
    const phase = wanted(rows, w.mode === "auto");
    if (!phase) {
      await touchBatchIf(w.id, ["waiting"], { status: "in_review" });
      continue;
    }
    try {
      const extra = phase === "rendering" && !w.render_requested_at ? { render_requested_at: new Date().toISOString() } : {};
      if (await touchBatchIf(w.id, ["waiting"], { status: phase, ...extra })) ensureLoop(w.id);
      return;
    } catch (err) {
      if (laneTaken(err)) return; // still held: it stays waiting
      throw err;
    }
  }
}

/** Make sure a new batch is not blocked by a dead one holding the slot. */
export async function clearDeadHolders(typeId: string): Promise<void> {
  await releaseDeadHolders(typeId);
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
    const music = await lookupTrack(result.musicHint, row.id, ctx.pillar).catch(fallback(`music lookup for deck ${row.id}`, { music: result.musicHint ?? "", status: "not_found" as const, asked: result.musicHint ?? null }));
    const flagged = gate.flagged || music.status === "not_found";
    // Only if the deck is still ours: a Discard pressed while the writer was
    // working wins, and the copy is thrown away.
    await claimDeck(row.id, ["writing"], flagged ? "flagged" : "written", {
      hook: result.hook,
      caption: result.caption,
      copy,
      music: music.music || null,
      music_status: music.status,
      score: gate.score,
      flag_kind: gate.flagged ? gate.kind : music.status === "not_found" ? "music" : null,
      flag_reason: gate.flagged ? gate.reason : music.status === "not_found" ? "Track not found" : null,
      feedback: gate.flagged ? gate.fix : null,
      generation_metadata: { writer: result.writer, model: result.model, gate, music_asked: music.asked },
    });
  } catch (err) {
    await claimDeck(row.id, ["writing"], "failed", { last_error: err instanceof Error ? err.message : "Writing failed" });
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
    const still = await getDeckRow(row.id);
    if (still?.status !== "rendering") return; // discarded while painting
    await replaceSlides(
      row.id,
      slides.map((s) => ({ position: s.position, box_copy: s.boxCopy, image_ids: s.imageIds, image_url: s.imageUrls[0] ?? null, rendered_svg: s.svg })),
    );
    await claimDeck(row.id, ["rendering"], "rendered", { rendered_at: new Date().toISOString(), render_manifest: { slides: slides.map((s) => ({ n: s.position, images: s.imageIds })) } });
  } catch (err) {
    await claimDeck(row.id, ["rendering"], "failed", { last_error: err instanceof Error ? err.message : "Rendering failed" });
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
    // Only a batch that holds its type's slot works. Stopped, finished,
    // waiting and settled batches end the loop here.
    if (batch.lifecycle !== "open" || !RUNNING.includes(batch.phase)) return;
    const rows = currentDecks(await listDraftRows([batchId]));
    const auto = batch.mode === "auto";

    // 1. Anything still to write, with the note it was sent back with.
    const pending = rows.find((r) => r.status === "pending");
    if (pending) {
      await writeOne({ ...ctx, batch }, pending, pending.feedback ?? null);
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
      for (const d of dropped) await claimDeck(d.id, ["flagged"], "dropped");
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
      if (batch.phase !== "rendering" || !batch.renderRequestedAt) {
        const held = await touchBatchIf(batchId, RUNNING, { status: "rendering", render_requested_at: batch.renderRequestedAt ?? new Date().toISOString() });
        if (!held) return; // stopped or finished while we were away
      }
      assets = assets ?? (batch.libraryId ? await listAssets(batch.libraryId) : []);
      await renderOne({ ...ctx, batch }, toRender[0], assets);
      continue;
    }
    // 4. Nothing left to do: settle the batch's phase and ring the bell once.
    const decks = rows.map((r) => toDeck(r));
    const counts = countDecks(batch.requested, decks);
    const summary = { ...batch, counts };
    const words = batchWords(summary);
    const settled = await touchBatchIf(batchId, RUNNING, { status: "in_review" });
    if (!settled) return; // stopped or finished while we were away: nothing to announce
    if (batch.phase === "generating" && words.stage === "to_render") await notifyBatchWritten(summary);
    else if (batch.phase === "rendering" && words.stage === "to_approve") await notifyBatchFinished(summary);
    return;
  }
}

/**
 * Start (or queue) whatever the batch's decks now ask for. Every press that
 * creates work ends here, after it has moved its decks.
 */
async function startOrWait(batchId: string, extra: Record<string, unknown> = {}): Promise<"started" | "waiting" | "idle"> {
  const batch = await fresh(batchId);
  const rows = currentDecks(await listDraftRows([batchId]));
  const phase = wanted(rows, batch.mode === "auto");
  if (!phase) {
    await touchBatch(batchId, extra);
    return "idle";
  }
  const outcome = await takeSlot(batchId, batch.typeId, phase, extra);
  if (outcome === "started") ensureLoop(batchId);
  return outcome;
}

/** Regenerate one deck with feedback: a new version at the same position, written in the batch's turn. */
export async function regenerateDeck(batchId: string, deckId: string, feedback: string | null): Promise<"started" | "waiting" | "idle"> {
  const rows = await listDraftRows([batchId]);
  const prev = rows.find((r) => r.id === deckId);
  if (!prev) throw new Error("Deck not found");
  const gone = await claimDeck(prev.id, ["pending", "written", "render_queued", "rendered", "flagged", "dropped", "failed"], "discarded");
  if (!gone) throw new Error("This deck cannot be regenerated right now");
  await newDeckVersion(prev, { feedback: feedback ?? prev.flag_reason, auto_tries: 1 });
  return startOrWait(batchId);
}

/** Regenerate every flagged or dropped deck, with one note for all of them. */
export async function regenerateFlagged(batchId: string, feedback: string | null): Promise<number> {
  const rows = currentDecks(await listDraftRows([batchId])).filter((r) => r.status === "flagged" || r.status === "dropped");
  let n = 0;
  for (const r of rows) {
    if (!(await claimDeck(r.id, ["flagged", "dropped"], "discarded"))) continue;
    await newDeckVersion(r, { feedback: feedback ?? r.flag_reason, auto_tries: 1 });
    n++;
  }
  await startOrWait(batchId);
  return n;
}

export async function retryDeck(batchId: string, deckId: string): Promise<"started" | "waiting" | "idle"> {
  const back = await claimDeck(deckId, ["failed"], "pending", { last_error: null });
  if (!back) throw new Error("Only a failed deck can be retried");
  return startOrWait(batchId);
}

/** Render (n) decks: queue every clean written deck and let the loop paint them in the batch's turn. */
export async function renderBatch(batchId: string): Promise<{ queued: number; waiting: boolean }> {
  const rows = currentDecks(await listDraftRows([batchId])).filter((r) => r.status === "written");
  let queued = 0;
  for (const r of rows) if (await claimDeck(r.id, ["written"], "render_queued")) queued++;
  const batch = await fresh(batchId);
  const outcome = await startOrWait(batchId, batch.renderRequestedAt ? {} : { render_requested_at: new Date().toISOString() });
  return { queued, waiting: outcome === "waiting" };
}

const OUTSTANDING = ["pending", "writing", "written", "render_queued", "rendering", "flagged", "failed"];

/**
 * Approve (n) decks: the only approval in the app. Auto never calls this.
 * The batch is signed off whole (Garreth, 2026-09-29): while any deck is
 * still to be written, rendered, fixed or retried, Approve is refused.
 * Finish is the press that closes a batch early.
 */
export async function approveBatch(batchId: string, by: string): Promise<number> {
  const rows = currentDecks(await listDraftRows([batchId]));
  const open = rows.filter((r) => OUTSTANDING.includes(r.status));
  if (open.length) throw new Error(`${open.length} ${open.length === 1 ? "deck is" : "decks are"} not ready. Render, regenerate or discard ${open.length === 1 ? "it" : "them"} first`);
  const now = new Date().toISOString();
  let n = 0;
  for (const r of rows.filter((x) => x.status === "rendered")) {
    if (await claimDeck(r.id, ["rendered"], "approved", { human_approved: true, approved_at: now, approved_by: by })) n++;
  }
  if (!n) throw new Error("Nothing is rendered yet");
  const batch = await fresh(batchId);
  await touchBatch(batchId, { status: "finished", approved_at: now, finished_at: now });
  await advanceQueue(batch.typeId);
  return n;
}

export async function stopBatch(batchId: string): Promise<void> {
  const batch = await fresh(batchId);
  await touchBatch(batchId, { status: "stopped" });
  await advanceQueue(batch.typeId);
}

export async function continueBatch(batchId: string): Promise<"started" | "waiting" | "idle"> {
  const rows = currentDecks(await listDraftRows([batchId]));
  // A deck the dead worker left mid-way goes back to the queue it came from.
  if (!loopRunning(batchId)) {
    for (const r of rows) {
      if (r.status === "writing") await claimDeck(r.id, ["writing"], "pending");
      if (r.status === "rendering") await claimDeck(r.id, ["rendering"], "render_queued");
    }
  }
  const outcome = await startOrWait(batchId);
  if (outcome === "idle") await touchBatchIf(batchId, ["stopped", "waiting", ...RUNNING], { status: "in_review" });
  return outcome;
}

export async function finishBatch(batchId: string): Promise<void> {
  const batch = await fresh(batchId);
  await touchBatch(batchId, { status: "finished", finished_at: new Date().toISOString() });
  await advanceQueue(batch.typeId);
}

export async function setAutoMode(batchId: string, auto: boolean): Promise<void> {
  await touchBatch(batchId, { mode: auto ? "auto" : "manual" });
  if (auto) ensureLoop(batchId);
}

export async function discardDeck(batchId: string, deckId: string): Promise<void> {
  const gone = await claimDeck(deckId, ["pending", "writing", "written", "render_queued", "rendering", "rendered", "flagged", "dropped", "failed"], "discarded");
  if (!gone) throw new Error("This deck cannot be discarded");
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

/**
 * Called when a batch is read. A batch whose loop should be alive but is
 * not (the server restarted) is restarted; a waiting batch gets its turn
 * checked, so it never depends on the holder's process still being alive.
 */
export async function reviveIfNeeded(batch: Batch): Promise<void> {
  if (batch.lifecycle !== "open" || loopRunning(batch.id)) return;
  if (batch.phase === "waiting") {
    await advanceQueue(batch.typeId).catch((e) => logError(`queue for ${batch.typeId}`, e));
    return;
  }
  const w = batchWords(batch);
  if (w.stage !== "writing" && w.stage !== "rendering") return;
  if (RUNNING.includes(batch.phase)) ensureLoop(batch.id);
  else await startOrWait(batch.id).catch((e) => logError(`batch ${batch.id} revive`, e));
}
