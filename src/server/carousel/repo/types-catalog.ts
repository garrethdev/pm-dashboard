/**
 * Carousel types: the registry's image carousels plus Studio-made templates
 * that are not wired yet, each with its template, its Writing, its library,
 * its supply and its batches.
 */
import { dbGet, dbGetAll, dbRpc, enc } from "@/server/carousel/repo/db";
import type { CarouselType, WritingVersion } from "@/server/carousel/repo/types";
import { listActiveWriting } from "@/server/carousel/repo/writing";
import { listTemplateRecords } from "@/server/carousel/repo/templates";

interface RegistryRow {
  content_type: string;
  display_name: string | null;
  character: string | null;
  media_shape: string;
  lifecycle: string;
  cadence_per_week: number | null;
  source_table: string | null;
}

interface PoolRow {
  content_type: string;
  pool_n: number | string;
}

interface StatRow {
  content_type: string;
  median_views: number | null;
}

/** What a batch row needs to know about its type without the whole catalogue. */
export interface TypeBasics {
  id: string;
  name: string;
  character: string;
  slides: number | null;
  size: string | null;
  laneTable: string | null;
}

function sizeOf(template: Record<string, unknown> | null): { slides: number | null; size: string | null } {
  if (!template) return { slides: null, size: null };
  const slides = Array.isArray(template.slides) ? template.slides.length : null;
  const canvas = template.canvas as { width?: number; height?: number } | undefined;
  let size: string | null = null;
  if (canvas?.width && canvas?.height) {
    const r = canvas.width / canvas.height;
    size = Math.abs(r - 4 / 5) < 0.02 ? "4:5" : Math.abs(r - 9 / 16) < 0.02 ? "9:16" : Math.abs(r - 3 / 4) < 0.02 ? "3:4" : Math.abs(r - 1) < 0.02 ? "1:1" : `${canvas.width}×${canvas.height}`;
  }
  return { slides, size };
}

let basicsCache: { at: number; map: Map<string, TypeBasics> } | null = null;

export async function getTypeBasics(): Promise<Map<string, TypeBasics>> {
  if (basicsCache && Date.now() - basicsCache.at < 30_000) return basicsCache.map;
  const [registry, templates] = await Promise.all([
    dbGetAll<RegistryRow>("content_type_registry?select=content_type,display_name,character,media_shape,lifecycle,cadence_per_week,source_table&media_shape=eq.image_carousel"),
    listTemplateRecords(),
  ]);
  const map = new Map<string, TypeBasics>();
  for (const r of registry) {
    const t = templates.find((x) => x.contentType === r.content_type);
    map.set(r.content_type, {
      id: r.content_type,
      name: r.display_name ?? r.content_type,
      character: r.character ?? "",
      laneTable: r.source_table,
      ...sizeOf(t?.template ?? null),
    });
  }
  for (const t of templates) {
    if (t.contentType && map.has(t.contentType)) continue;
    map.set(t.slug, { id: t.slug, name: t.name, character: t.character, laneTable: null, ...sizeOf(t.template) });
  }
  basicsCache = { at: Date.now(), map };
  return map;
}

export function forgetTypeBasics() {
  basicsCache = null;
}

/**
 * The full catalogue. Batches are joined in by the caller (overview.ts), so
 * this module does not import the batch module and the two stay one-way.
 */
export async function listTypeShells(): Promise<Omit<CarouselType, "lastBatch" | "runningBatch" | "waitingBatch" | "lastAuto">[]> {
  const [registry, templates, writing, pools, stats, libraries] = await Promise.all([
    dbGetAll<RegistryRow>("content_type_registry?select=content_type,display_name,character,media_shape,lifecycle,cadence_per_week,source_table&media_shape=eq.image_carousel&order=display_name.asc"),
    listTemplateRecords(),
    listActiveWriting(),
    dbGet<PoolRow[]>("v_scheduler_pool?select=content_type,pool_n").catch(() => [] as PoolRow[]),
    dbRpc<StatRow[]>("content_type_stats_fleet", { p_days: 30, p_fleet: "cloud" }).catch(() => [] as StatRow[]),
    dbGetAll<{ id: string; name: string }>("image_libraries?select=id,name"),
  ]);
  const writingByType = new Map<string, WritingVersion>(writing.map((w) => [w.typeId, w]));
  const shells: Omit<CarouselType, "lastBatch" | "runningBatch" | "waitingBatch" | "lastAuto">[] = [];

  for (const r of registry) {
    const t = templates.find((x) => x.contentType === r.content_type);
    const pool = pools.filter((p) => p.content_type === r.content_type).reduce((n, p) => n + Number(p.pool_n ?? 0), 0);
    const perDay = (r.cadence_per_week ?? 0) / 7;
    const lib = libraries.find((l) => l.id === t?.libraryId);
    shells.push({
      id: r.content_type,
      slug: t?.slug ?? r.content_type,
      name: r.display_name ?? r.content_type,
      character: r.character ?? "",
      lifecycle: r.lifecycle === "retired" ? "retired" : r.lifecycle === "paused" ? "paused" : "live",
      templateId: t?.id ?? null,
      templateVersion: t?.activeVersion ?? null,
      libraryId: t?.libraryId ?? null,
      libraryName: lib?.name ?? null,
      writing: writingByType.get(r.content_type) ?? null,
      postsLeft: pools.length ? pool : null,
      daysOfCover: pools.length ? (perDay > 0 ? Math.floor(pool / perDay) : null) : null,
      medianViews: stats.find((s) => s.content_type === r.content_type)?.median_views ?? null,
      laneTable: r.source_table,
      ...sizeOf(t?.template ?? null),
    });
  }
  for (const t of templates) {
    if (t.contentType && registry.some((r) => r.content_type === t.contentType)) continue;
    if (t.status === "archived") continue;
    const lib = libraries.find((l) => l.id === t.libraryId);
    shells.push({
      id: t.slug,
      slug: t.slug,
      name: t.name,
      character: t.character,
      lifecycle: "not_wired",
      templateId: t.id,
      templateVersion: t.activeVersion,
      libraryId: t.libraryId,
      libraryName: lib?.name ?? null,
      writing: writingByType.get(t.slug) ?? null,
      postsLeft: null,
      daysOfCover: null,
      medianViews: null,
      laneTable: null,
      ...sizeOf(t.template),
    });
  }
  return shells;
}
