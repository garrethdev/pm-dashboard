/**
 * Batches and decks: `carousel_briefs`, `carousel_drafts`,
 * `carousel_draft_slides`, read and written the way the screens need them.
 */
import { dbGet, dbGetAll, dbInsert, dbPatch, enc } from "@/server/carousel/repo/db";
import type { Batch, BatchSummary, Deck, DeckSlide, DeckState, NewBatch } from "@/server/carousel/repo/types";
import { batchName } from "@/server/carousel/batches/runner";
import { getTypeBasics, type TypeBasics } from "@/server/carousel/repo/types-catalog";
import { getTemplateRecord, getTemplateVersion } from "@/server/carousel/repo/templates";

export interface BriefRow {
  id: string;
  title: string | null;
  status: string;
  content_type: string | null;
  rerun_of: string | null;
  template_id: string | null;
  template_version: number | null;
  image_library_id: string | null;
  writing_version_id: string | null;
  batch_name: string | null;
  requested: number | null;
  auto_mode: boolean;
  mode: "manual" | "auto";
  note: string | null;
  per_batch_text: Record<string, string> | null;
  revision: number;
  last_movement_at: string | null;
  render_requested_at: string | null;
  approved_at: string | null;
  finished_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DraftRow {
  id: string;
  brief_id: string;
  version: number;
  position: number | null;
  status: string;
  auto_tries: number;
  hook: string | null;
  caption: string | null;
  copy: Record<string, string> | null;
  music: string | null;
  music_status: string | null;
  score: number | string | null;
  flag_kind: string | null;
  flag_reason: string | null;
  last_error: string | null;
  feedback: string | null;
  lane_row_id: string | null;
  rendered_at: string | null;
  approved_at: string | null;
  human_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface SlideRow {
  id: string;
  draft_id: string;
  position: number;
  box_copy: Record<string, string> | null;
  image_ids: string[] | null;
  image_url: string | null;
  rendered_url: string | null;
  rendered_svg: string | null;
}

const BRIEF_COLS =
  "id,title,status,content_type,rerun_of,template_id,template_version,image_library_id,writing_version_id,batch_name,requested,auto_mode,mode,note,per_batch_text,revision,last_movement_at,render_requested_at,approved_at,finished_at,created_by,created_at,updated_at";
const DRAFT_COLS =
  "id,brief_id,version,position,status,auto_tries,hook,caption,copy,music,music_status,score,flag_kind,flag_reason,last_error,feedback,lane_row_id,rendered_at,approved_at,human_approved,created_at,updated_at";
const SLIDE_COLS = "id,draft_id,position,box_copy,image_ids,image_url,rendered_url,rendered_svg";

const DECK_STATES = new Set<DeckState>([
  "pending", "writing", "written", "render_queued", "rendering", "rendered", "approved", "flagged", "failed", "dropped", "discarded",
]);

function deckState(status: string): DeckState {
  if (DECK_STATES.has(status as DeckState)) return status as DeckState;
  // Rows written by the older draft vocabulary.
  if (status === "draft" || status === "in_review") return "written";
  if (status === "rejected") return "discarded";
  if (status === "posted") return "approved";
  return "pending";
}

function lifecycleOf(status: string): Batch["lifecycle"] {
  if (status === "stopped") return "stopped";
  if (status === "finished" || status === "archived") return "finished";
  return "open";
}

function num(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toDeck(r: DraftRow, slides: SlideRow[] = []): Deck {
  const state = deckState(r.status);
  const ms = r.music_status;
  return {
    id: r.id,
    batchId: r.brief_id,
    position: r.position ?? 0,
    version: r.version,
    state,
    tries: r.auto_tries ?? 1,
    hook: r.hook,
    caption: r.caption,
    copy: r.copy ?? {},
    music: r.music,
    musicStatus: ms === "found" || ms === "not_found" || ms === "checking" ? ms : null,
    score: num(r.score),
    flagKind: r.flag_kind,
    flagReason: r.flag_reason,
    lastError: r.last_error,
    feedback: r.feedback,
    laneRowId: r.lane_row_id,
    slides: slides
      .filter((s) => s.draft_id === r.id)
      .sort((a, b) => a.position - b.position)
      .map<DeckSlide>((s) => ({
        position: s.position,
        copy: s.box_copy ?? {},
        imageUrls: s.image_url ? [s.image_url] : [],
        renderedUrl: s.rendered_url,
        renderedSvg: s.rendered_svg,
      })),
    renderedAt: r.rendered_at,
    approvedAt: r.approved_at,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
  };
}

/** Only the newest version of each position counts; older versions are history. */
export function currentDecks(rows: DraftRow[]): DraftRow[] {
  const byPos = new Map<number, DraftRow>();
  for (const r of rows) {
    const pos = r.position ?? 0;
    const cur = byPos.get(pos);
    if (!cur || r.version > cur.version) byPos.set(pos, r);
  }
  return [...byPos.values()].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function countDecks(requested: number, decks: Deck[]): BatchSummary["counts"] {
  const n = (...states: DeckState[]) => decks.filter((d) => states.includes(d.state)).length;
  return {
    requested,
    decks: decks.length,
    pending: n("pending"),
    writing: n("writing"),
    written: n("written", "render_queued", "rendering", "rendered", "approved"),
    rendering: n("render_queued", "rendering"),
    rendered: n("rendered", "approved"),
    approved: n("approved"),
    flagged: n("flagged"),
    dropped: n("dropped"),
    failed: n("failed"),
    discarded: n("discarded"),
  };
}

export function toSummary(r: BriefRow, decks: Deck[], type: TypeBasics | undefined): BatchSummary {
  const requested = r.requested ?? decks.length;
  return {
    id: r.id,
    typeId: r.content_type ?? "",
    typeName: type?.name ?? r.title ?? r.content_type ?? "Carousel",
    character: type?.character ?? "",
    slides: type?.slides ?? null,
    size: type?.size ?? null,
    batchName: r.batch_name ?? r.title ?? r.id.slice(0, 8),
    requested,
    lifecycle: lifecycleOf(r.status),
    phase: r.status,
    mode: r.mode === "auto" ? "auto" : "manual",
    madeInAuto: r.auto_mode,
    revision: r.revision ?? 0,
    rerunOf: r.rerun_of,
    note: r.note,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastMovementAt: r.last_movement_at ?? r.updated_at,
    renderRequestedAt: r.render_requested_at,
    approvedAt: r.approved_at,
    finishedAt: r.finished_at,
    counts: countDecks(requested, decks),
  };
}

export async function listBriefRows(filter = ""): Promise<BriefRow[]> {
  return dbGetAll<BriefRow>(`carousel_briefs?select=${BRIEF_COLS}&content_type=not.is.null${filter}&order=created_at.desc`);
}

export async function listDraftRows(briefIds: string[]): Promise<DraftRow[]> {
  if (!briefIds.length) return [];
  const out: DraftRow[] = [];
  for (let i = 0; i < briefIds.length; i += 40) {
    const chunk = briefIds.slice(i, i + 40).map(enc).join(",");
    out.push(...(await dbGetAll<DraftRow>(`carousel_drafts?select=${DRAFT_COLS}&brief_id=in.(${chunk})&order=position.asc,version.asc`)));
  }
  return out;
}

/** Every batch as a summary, newest first. */
export async function listBatches(opts: { typeId?: string; limit?: number } = {}): Promise<BatchSummary[]> {
  const filter = opts.typeId ? `&content_type=eq.${enc(opts.typeId)}` : "";
  const briefs = (await listBriefRows(filter)).slice(0, opts.limit ?? 500);
  const drafts = await listDraftRows(briefs.map((b) => b.id));
  const types = await getTypeBasics();
  return briefs.map((b) => {
    const decks = currentDecks(drafts.filter((d) => d.brief_id === b.id)).map((d) => toDeck(d));
    return toSummary(b, decks, types.get(b.content_type ?? ""));
  });
}

export async function getBatch(id: string): Promise<Batch | null> {
  const rows = await dbGet<BriefRow[]>(`carousel_briefs?select=${BRIEF_COLS}&id=eq.${enc(id)}`);
  const b = rows[0];
  if (!b) return null;
  const drafts = currentDecks(await listDraftRows([id]));
  const slides = drafts.length
    ? await dbGetAll<SlideRow>(`carousel_draft_slides?select=${SLIDE_COLS}&draft_id=in.(${drafts.map((d) => enc(d.id)).join(",")})`)
    : [];
  const decks = drafts.map((d) => toDeck(d, slides));
  const types = await getTypeBasics();
  let roles: string[] = [];
  if (b.template_id) {
    const tpl = (b.template_version ? await getTemplateVersion(b.template_id, b.template_version) : null) ?? (await getTemplateRecord(b.template_id))?.template ?? null;
    const tplSlides = (tpl?.slides as { text?: { role: string }[] }[] | undefined) ?? [];
    roles = [...new Set(tplSlides.flatMap((s) => (s.text ?? []).map((t) => t.role)))];
  }
  return {
    ...toSummary(b, decks, types.get(b.content_type ?? "")),
    templateId: b.template_id,
    templateVersion: b.template_version,
    libraryId: b.image_library_id,
    writingVersionId: b.writing_version_id,
    perBatchText: b.per_batch_text ?? {},
    roles,
    decks,
  };
}

export async function createBatch(
  input: NewBatch,
  refs: { templateId: string | null; templateVersion: number | null; writingVersionId: string | null; title: string },
): Promise<Batch> {
  const today = new Date().toISOString().slice(0, 10);
  const sameDay = await dbGet<{ id: string }[]>(
    `carousel_briefs?select=id&content_type=eq.${enc(input.typeId)}&created_at=gte.${today}T00:00:00Z`,
  );
  const now = new Date().toISOString();
  const [row] = await dbInsert<BriefRow>("carousel_briefs", {
    title: refs.title,
    format: "carousel",
    status: "generating",
    content_type: input.typeId,
    rerun_of: input.rerunOf ?? null,
    template_id: refs.templateId,
    template_version: refs.templateVersion,
    image_library_id: input.libraryId,
    writing_version_id: refs.writingVersionId,
    batch_name: batchName(input.typeId, today, sameDay.length),
    requested: input.requested,
    auto_mode: input.auto,
    mode: input.auto ? "auto" : "manual",
    note: input.note || null,
    per_batch_text: input.perBatchText,
    revision: 0,
    last_movement_at: now,
    created_by: input.createdBy,
    selected_reference_ids: [],
    constraints: {},
  });
  await dbInsert(
    "carousel_drafts",
    Array.from({ length: input.requested }, (_, i) => ({
      brief_id: row.id,
      version: 1,
      position: i + 1,
      status: "pending",
      generation_metadata: {},
    })),
  );
  return (await getBatch(row.id))!;
}

export async function patchBatch(id: string, patch: Record<string, unknown>): Promise<void> {
  await dbPatch(`carousel_briefs?id=eq.${enc(id)}`, { ...patch, updated_at: new Date().toISOString() });
}

/** Every batch change bumps the revision and the movement clock. */
export async function touchBatch(id: string, patch: Record<string, unknown> = {}): Promise<void> {
  const cur = await dbGet<{ revision: number }[]>(`carousel_briefs?select=revision&id=eq.${enc(id)}`);
  const now = new Date().toISOString();
  await dbPatch(`carousel_briefs?id=eq.${enc(id)}`, {
    ...patch,
    revision: (cur[0]?.revision ?? 0) + 1,
    last_movement_at: now,
    updated_at: now,
  });
}

export async function getDeckRow(id: string): Promise<DraftRow | null> {
  const rows = await dbGet<DraftRow[]>(`carousel_drafts?select=${DRAFT_COLS}&id=eq.${enc(id)}`);
  return rows[0] ?? null;
}

export async function patchDeck(id: string, patch: Record<string, unknown>): Promise<DraftRow | null> {
  const rows = await dbPatch<DraftRow>(`carousel_drafts?id=eq.${enc(id)}`, { ...patch, updated_at: new Date().toISOString() });
  return rows[0] ?? null;
}

/** Claim a deck for work only if it is still in the state we expect (one worker at a time). */
export async function claimDeck(id: string, from: DeckState[], to: DeckState, extra: Record<string, unknown> = {}): Promise<DraftRow | null> {
  const rows = await dbPatch<DraftRow>(
    `carousel_drafts?id=eq.${enc(id)}&status=in.(${from.map(enc).join(",")})`,
    { ...extra, status: to, updated_at: new Date().toISOString() },
  );
  return rows[0] ?? null;
}

/** A new version of a deck at the same position (regenerate). */
export async function newDeckVersion(prev: DraftRow, patch: Record<string, unknown>): Promise<DraftRow> {
  const [row] = await dbInsert<DraftRow>("carousel_drafts", {
    brief_id: prev.brief_id,
    position: prev.position,
    version: prev.version + 1,
    status: "pending",
    auto_tries: prev.auto_tries,
    generation_metadata: {},
    ...patch,
  });
  return row;
}

export async function replaceSlides(
  draftId: string,
  slides: { position: number; box_copy: Record<string, string>; image_ids: string[]; image_url: string | null; rendered_svg: string | null }[],
): Promise<void> {
  await dbInsert("carousel_draft_slides", slides.map((s) => ({ draft_id: draftId, status: "draft", ...s })), {
    upsert: "draft_id,position",
  });
}

export async function listSlideRows(draftIds: string[]): Promise<SlideRow[]> {
  if (!draftIds.length) return [];
  return dbGetAll<SlideRow>(`carousel_draft_slides?select=${SLIDE_COLS}&draft_id=in.(${draftIds.map(enc).join(",")})`);
}
