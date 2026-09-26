/**
 * The Trends page's reads and writes: the reference library's carousels,
 * what one person has seen, saved and voted, the study digests and the
 * knowledge base.
 */
import { dbCount, dbDelete, dbGet, dbGetAll, dbInsert, dbPatch, enc } from "@/server/carousel/repo/db";
import { displayUrl } from "@/server/carousel/media";
import { fallback } from "@/server/carousel/log";
import type { Digest, KnowledgeRule, Reference, ReferenceAnalysis } from "@/server/carousel/repo/types";

interface RefRow {
  id: number;
  platform: string;
  creator_handle: string | null;
  hook_text: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  views: number | null;
  likes: number | null;
  saves: number | null;
  total_score: number | string;
  published_at: string | null;
  created_at: string | null;
  niche_tags: string[] | null;
  hook_type: string | null;
}

interface BeatRow {
  source_reference_id: number;
  position: number;
  visible_copy: string | null;
  visual_description: string | null;
  narrative_role: string | null;
}

interface AnalysisRow {
  source_reference_id: number;
  analysis_version: string;
  inspection_status: string | null;
  topic: string | null;
  angle: string | null;
  hook_family: string | null;
  emotional_tone: string | null;
  visual_style: string | null;
  opener_treatment: string | null;
  proof_placement: string | null;
  cta_structure: string | null;
  observed: Record<string, unknown> | null;
  inferred: Record<string, unknown> | null;
  updated_at: string;
}

const REF_COLS = "id,platform,creator_handle,hook_text,source_url,thumbnail_url,views,likes,saves,total_score,published_at,created_at,niche_tags,hook_type";
const PAGE = 20;

async function beatsFor(ids: number[]): Promise<Map<number, BeatRow[]>> {
  const map = new Map<number, BeatRow[]>();
  if (!ids.length) return map;
  const rows = await dbGetAll<BeatRow>(`reference_beats?select=source_reference_id,position,visible_copy,visual_description,narrative_role&kind=eq.slide&source_reference_id=in.(${ids.join(",")})&order=position.asc`);
  for (const r of rows) map.set(r.source_reference_id, [...(map.get(r.source_reference_id) ?? []), r]);
  return map;
}

/** The slides' images live in the analysis's media inventory; beats carry the words. */
function mediaOf(a: AnalysisRow | undefined): (string | null)[] {
  const inv = (a?.observed?.media_inventory as { position: number; image_url: string }[] | undefined) ?? [];
  return [...inv].sort((x, y) => x.position - y.position).map((m) => displayUrl(m.image_url));
}

async function analysesFor(ids: number[]): Promise<Map<number, AnalysisRow>> {
  const map = new Map<number, AnalysisRow>();
  if (!ids.length) return map;
  const rows = await dbGetAll<AnalysisRow>(`reference_analysis?select=source_reference_id,analysis_version,inspection_status,topic,angle,hook_family,emotional_tone,visual_style,opener_treatment,proof_placement,cta_structure,observed,inferred,updated_at&source_reference_id=in.(${ids.join(",")})`);
  // Prefer the fuller run when a carousel was read twice.
  const rank = (v: string) => (v === "perez-slides-v1" ? 2 : v === "phase0-multiformat-v1" ? 1 : 0);
  for (const r of rows) {
    const cur = map.get(r.source_reference_id);
    if (!cur || rank(r.analysis_version) > rank(cur.analysis_version)) map.set(r.source_reference_id, r);
  }
  return map;
}

/**
 * The latest performance snapshot per reference, for rows the intake left at
 * zero. Since 2026-09-12 the bridge writes every new reference with views,
 * likes and saves of 0 and keeps the real numbers in the snapshots table
 * (Garreth, 2026-09-26: read the snapshot, do not change the bridge). The
 * one-off backfill fixed the rows that existed then; this covers the rest.
 */
async function snapshotsFor(ids: number[]): Promise<Map<number, { views: number; likes: number; saves: number }>> {
  const map = new Map<number, { views: number; likes: number; saves: number }>();
  if (!ids.length) return map;
  const rows = await dbGetAll<{ source_reference_id: number; views: number | null; likes: number | null; bookmarks: number | null }>(
    `source_performance_snapshots?select=source_reference_id,views,likes,bookmarks&source_reference_id=in.(${ids.join(",")})&views=gt.0&order=observed_at.desc`,
  ).catch(fallback("snapshots", []));
  for (const r of rows) {
    if (!map.has(r.source_reference_id)) map.set(r.source_reference_id, { views: Number(r.views) || 0, likes: Number(r.likes) || 0, saves: Number(r.bookmarks) || 0 });
  }
  return map;
}

async function personal(viewer: string, ids: number[]): Promise<{ saved: Set<number>; votes: Map<number, "up" | "down"> }> {
  if (!ids.length) return { saved: new Set(), votes: new Map() };
  const list = ids.join(",");
  const [saves, votes] = await Promise.all([
    dbGetAll<{ reference_id: number }>(`reference_favourites?select=reference_id&saved_by=eq.${enc(viewer)}&reference_id=in.(${list})`),
    dbGetAll<{ reference_id: number; vote: "up" | "down" }>(`reference_votes?select=reference_id,vote&voted_by=eq.${enc(viewer)}&reference_id=in.(${list})`),
  ]);
  return { saved: new Set(saves.map((s) => s.reference_id)), votes: new Map(votes.map((v) => [v.reference_id, v.vote])) };
}

async function hydrate(rows: RefRow[], viewer: string): Promise<Reference[]> {
  const ids = rows.map((r) => r.id);
  const zero = rows.filter((r) => !r.views).map((r) => r.id);
  const [beats, analyses, me, snaps] = await Promise.all([beatsFor(ids), analysesFor(ids), personal(viewer, ids), snapshotsFor(zero)]);
  return rows.map((r) => {
    const a = analyses.get(r.id);
    const counts = r.views ? { views: r.views, likes: r.likes, saves: r.saves } : (snaps.get(r.id) ?? { views: r.views, likes: r.likes, saves: r.saves });
    const media = mediaOf(a);
    const b = beats.get(r.id) ?? [];
    const slides: Reference["slides"] = (b.length ? b : media.map((_, i) => ({ position: i + 1, visible_copy: null, visual_description: null, narrative_role: null }))).map((s, i) => ({
      position: s.position,
      media: media[s.position - 1] ?? media[i] ?? (i === 0 ? r.thumbnail_url : null),
      copy: s.visible_copy,
      visual: s.visual_description,
      role: s.narrative_role,
    }));
    if (!slides.length) slides.push({ position: 1, media: r.thumbnail_url, copy: null, visual: null, role: null });
    const topicText = a?.topic ?? "";
    const topics = [...new Set([...topicText.split(",").map((t) => t.trim()).filter(Boolean), ...((a?.inferred?.topic_tags as string[] | undefined) ?? [])])].slice(0, 4);
    return {
      id: r.id,
      platform: r.platform,
      handle: r.creator_handle,
      hook: r.hook_text,
      sourceUrl: r.source_url,
      thumbnail: r.thumbnail_url,
      slides,
      views: counts.views,
      likes: counts.likes,
      saves: counts.saves,
      publishedAt: r.published_at,
      topics,
      hookFamily: a?.hook_family ?? r.hook_type,
      score: Number(r.total_score) || 0,
      createdAt: r.created_at,
      saved: me.saved.has(r.id),
      vote: me.votes.get(r.id) ?? null,
    };
  });
}

/** The library's ranking (DEV-36): best score first, then views, then id. */
const ORDER = "order=total_score.desc.nullslast,views_normalized.desc.nullslast,id.asc";

/** The carousels this person has not seen, keyset-paged (DEV-45). */
export async function unseenFeed(viewer: string, after: { score: number; id: number } | null): Promise<{ items: Reference[]; more: boolean }> {
  const seen = await dbGetAll<{ reference_id: number }>(`reference_seen?select=reference_id&seen_by=eq.${enc(viewer)}`);
  const seenIds = new Set(seen.map((s) => s.reference_id));
  const out: RefRow[] = [];
  let cursor = after;
  let more = true;
  while (out.length < PAGE && more) {
    const filter = cursor ? `&or=(total_score.lt.${cursor.score},and(total_score.eq.${cursor.score},id.gt.${cursor.id}))` : "";
    const page = await dbGet<RefRow[]>(`references_unified?select=${REF_COLS}&format=eq.carousel${filter}&${ORDER}&limit=${PAGE * 2}`);
    more = page.length === PAGE * 2;
    for (const r of page) if (!seenIds.has(r.id) && out.length < PAGE) out.push(r);
    const last = page[page.length - 1];
    if (!last) break;
    cursor = { score: Number(last.total_score) || 0, id: last.id };
  }
  return { items: await hydrate(out, viewer), more: more || out.length === PAGE };
}

/** What this person has already seen, most recently seen first. */
export async function seenFeed(viewer: string, before: string | null): Promise<{ items: Reference[]; more: boolean }> {
  const filter = before ? `&seen_at=lt.${enc(before)}` : "";
  const seen = await dbGet<{ reference_id: number; seen_at: string }[]>(`reference_seen?select=reference_id,seen_at&seen_by=eq.${enc(viewer)}${filter}&order=seen_at.desc&limit=${PAGE}`);
  if (!seen.length) return { items: [], more: false };
  const rows = await dbGetAll<RefRow>(`references_unified?select=${REF_COLS}&format=eq.carousel&id=in.(${seen.map((s) => s.reference_id).join(",")})`);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = seen.map((s) => byId.get(s.reference_id)).filter((r): r is RefRow => Boolean(r));
  const items = await hydrate(ordered, viewer);
  return { items: items.map((i) => ({ ...i, seenAt: seen.find((s) => s.reference_id === i.id)?.seen_at })), more: seen.length === PAGE };
}

export async function markSeen(viewer: string, ids: number[]): Promise<void> {
  if (!ids.length) return;
  await dbInsert("reference_seen", ids.map((reference_id) => ({ reference_id, seen_by: viewer })), { upsert: "reference_id,seen_by" });
}

/** Seen rows only ever name carousels, so the difference of two counts is the unseen count. */
export async function unseenCount(viewer: string): Promise<number> {
  const [all, seen] = await Promise.all([
    dbCount("references_unified?format=eq.carousel"),
    dbCount(`reference_seen?seen_by=eq.${enc(viewer)}`),
  ]);
  return Math.max(0, all - seen);
}

export async function savedFeed(viewer: string, limit = 200): Promise<Reference[]> {
  const saves = await dbGet<{ reference_id: number; saved_at: string }[]>(`reference_favourites?select=reference_id,saved_at&saved_by=eq.${enc(viewer)}&order=saved_at.desc&limit=${limit}`);
  if (!saves.length) return [];
  const rows = await dbGetAll<RefRow>(`references_unified?select=${REF_COLS}&id=in.(${saves.map((s) => s.reference_id).join(",")})`);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return hydrate(saves.map((s) => byId.get(s.reference_id)).filter((r): r is RefRow => Boolean(r)), viewer);
}

export async function toggleSave(viewer: string, id: number): Promise<boolean> {
  const existing = await dbGet<{ id: number }[]>(`reference_favourites?select=id&saved_by=eq.${enc(viewer)}&reference_id=eq.${id}`);
  if (existing.length) {
    await dbDelete(`reference_favourites?saved_by=eq.${enc(viewer)}&reference_id=eq.${id}`);
    return false;
  }
  await dbInsert("reference_favourites", { reference_id: id, saved_by: viewer }, { upsert: "reference_id,saved_by" });
  return true;
}

export async function castVote(viewer: string, id: number, vote: "up" | "down" | null, query: string | null): Promise<"up" | "down" | null> {
  if (vote === null) {
    await dbDelete(`reference_votes?voted_by=eq.${enc(viewer)}&reference_id=eq.${id}`);
    return null;
  }
  await dbInsert("reference_votes", { reference_id: id, voted_by: viewer, vote, query, voted_at: new Date().toISOString() }, { upsert: "reference_id,voted_by" });
  return vote;
}

export async function getReference(viewer: string, id: number): Promise<Reference | null> {
  const rows = await dbGet<RefRow[]>(`references_unified?select=${REF_COLS}&id=eq.${id}`);
  if (!rows[0]) return null;
  return (await hydrate(rows, viewer))[0] ?? null;
}

/** Trending: the top of what the library scraped today, or the newest scrape. */
export async function trending(viewer: string, n = 4): Promise<{ asOf: string | null; isToday: boolean; items: Reference[] }> {
  const newest = await dbGet<{ created_at: string }[]>(`references_unified?select=created_at&format=eq.carousel&order=created_at.desc&limit=1`);
  const at = newest[0]?.created_at ?? null;
  if (!at) return { asOf: null, isToday: false, items: [] };
  const day = at.slice(0, 10);
  const isToday = day === new Date().toISOString().slice(0, 10);
  const rows = await dbGet<RefRow[]>(`references_unified?select=${REF_COLS}&format=eq.carousel&created_at=gte.${day}T00:00:00Z&created_at=lt.${day}T23:59:59.999Z&${ORDER}&limit=${n}`);
  return { asOf: at, isToday, items: await hydrate(rows, viewer) };
}

const PLAIN: Record<string, string> = {
  outcome_preview: "Outcome preview",
  list_with_introduction: "List with an introduction",
  information_gap: "Information gap",
  contradiction: "Contradiction",
  recognition: "Recognition",
  question: "Question",
  list: "List",
};

function plainWord(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v);
  return PLAIN[s] ?? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export async function getAnalysis(id: number): Promise<ReferenceAnalysis> {
  const a = (await analysesFor([id])).get(id);
  if (!a) return { status: "none", readAt: null, summary: {}, howItWorks: {}, keep: [], limits: [], themes: [], questions: [], slidesRead: null };
  const inf = a.inferred ?? {};
  const payoff = inf.payoff as { position?: number | null; description?: string } | undefined;
  const pattern = inf.reusable_pattern as { invariants?: string[]; limitations?: string[] } | undefined;
  const response = inf.audience_response as { themes?: { theme: string }[]; questions?: string[] } | undefined;
  const coverage = (a.observed?.coverage as { inspected_images?: number; supplied_images?: number } | undefined) ?? {};
  const first = inf.first_product_slide as number | null | undefined;
  const summary: Record<string, string> = {};
  const put = (k: string, v: unknown) => { const w = plainWord(v); if (w) summary[k] = w; };
  put("Topic", a.topic);
  put("Angle", a.angle);
  put("Hook family", a.hook_family);
  put("Story structure", inf.story_structure);
  put("Emotional tone", a.emotional_tone);
  put("Visual style", a.visual_style);
  if (first) summary["First shown"] = `Slide ${first}`;
  const how: Record<string, string> = {};
  if (typeof inf.hook_mechanism === "string") how["Why it hooks"] = inf.hook_mechanism;
  if (a.opener_treatment) how["Opener"] = a.opener_treatment;
  if (payoff?.description) how["Payoff"] = `${payoff.position ? `Slide ${payoff.position}. ` : ""}${payoff.description}`;
  if (a.proof_placement) how["Proof"] = a.proof_placement;
  if (a.cta_structure) how["Call to action"] = `${plainWord(a.cta_structure)}${inf.first_explicit_cta_slide ? ` (slide ${inf.first_explicit_cta_slide})` : ""}`;
  const st = a.inspection_status === "complete" ? "complete" : a.inspection_status === "blocked" ? "blocked" : "partial";
  return {
    status: st,
    readAt: a.updated_at,
    summary,
    howItWorks: how,
    keep: pattern?.invariants ?? [],
    limits: pattern?.limitations ?? [],
    themes: (response?.themes ?? []).map((t) => t.theme).filter(Boolean),
    questions: response?.questions ?? [],
    slidesRead: coverage.supplied_images ? { read: coverage.inspected_images ?? 0, of: coverage.supplied_images } : null,
  };
}

interface DigestRow {
  id: number;
  received_at: string;
  subject: string | null;
  body: string | null;
  analysis: { rules?: { rule: string; confidence?: string; types?: string[] }[]; reference_ids?: number[]; queued?: { url: string; queued_at: string }[] } | null;
  analysed_at: string | null;
  carousel_count: number | null;
}

export async function listDigests(viewer: string): Promise<Digest[]> {
  const rows = await dbGet<DigestRow[]>("study_digests?select=id,received_at,subject,body,analysis,analysed_at,carousel_count&order=received_at.desc&limit=60");
  const ids = [...new Set(rows.flatMap((r) => r.analysis?.reference_ids ?? []))];
  const refs = ids.length ? await hydrate(await dbGetAll<RefRow>(`references_unified?select=${REF_COLS}&format=eq.carousel&id=in.(${ids.join(",")})`), viewer) : [];
  const byId = new Map(refs.map((r) => [r.id, r]));
  return rows.map((r) => ({
    id: r.id,
    receivedAt: r.received_at,
    subject: r.subject,
    body: r.body,
    analysedAt: r.analysed_at,
    carouselCount: r.carousel_count,
    rules: (r.analysis?.rules ?? []).map((x) => ({ rule: x.rule, confidence: x.confidence ?? null, types: x.types ?? [] })),
    carousels: (r.analysis?.reference_ids ?? []).map((id) => byId.get(id)).filter((x): x is Reference => Boolean(x)),
    queued: (r.analysis?.queued ?? []).map((q) => ({ url: q.url, queuedAt: q.queued_at })),
  }));
}

interface RuleRow {
  id: number;
  rule_key: string;
  category: string | null;
  rule_text: string;
  rationale: string | null;
  confidence: string | null;
  status: string;
  source: string;
  support_count: number;
  platform: string | null;
  updated_at: string;
}

export async function listKnowledge(): Promise<KnowledgeRule[]> {
  const rows = await dbGetAll<RuleRow>("content_knowledge_base?select=id,rule_key,category,rule_text,rationale,confidence,status,source,support_count,platform,updated_at&order=updated_at.desc");
  return rows.map((r) => ({
    id: r.id,
    ruleKey: r.rule_key,
    category: r.category,
    ruleText: r.rule_text,
    rationale: r.rationale,
    confidence: r.confidence,
    status: r.status,
    source: r.source,
    supportCount: r.support_count,
    platform: r.platform,
    updatedAt: r.updated_at,
  }));
}

export async function setRuleStatus(id: number, status: "active" | "rejected", by: string): Promise<void> {
  await dbPatch(`content_knowledge_base?id=eq.${id}`, { status, approved_by: by, updated_at: new Date().toISOString() });
}
