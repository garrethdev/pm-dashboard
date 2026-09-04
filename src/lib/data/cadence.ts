import { TTL, cachedFetcher } from "@/lib/data/cache";
import { sbRest } from "@/lib/data/supabase";

/**
 * Cadence (plan §6) — content_type_registry grouped by character, with
 * per-character Σ GLP indicator (must equal exactly 10) and each character's
 * filler cadence (registry row character='All', content_type='filler').
 */
export interface CadenceLane {
  contentType: string;
  sourceTable: string | null;
  bucket: string | null;
  cadencePerWeek: number | null;
  ceilingPerWeek: number | null;
  posterActive: boolean;
  poolNow: number;
  active: boolean;
  character: string;
}

export interface CadenceData {
  /** Active GLP lanes grouped per character, worst offenders first. */
  characters: { name: string; lanes: CadenceLane[]; glpSum: number; fillerPerWeek: number }[];
  retired: CadenceLane[];
}

async function fetchCadence(): Promise<CadenceData> {
  const [registry, pools] = await Promise.all([
    sbRest<
      {
        content_type: string;
        character: string;
        quota_bucket: string | null;
        cadence_per_week: number | null;
        cadence_ceiling_per_week: number | null;
        unified_poster_active: boolean;
        source_table: string | null;
        active: boolean;
      }[]
    >(
      "content_type_registry?select=content_type,character,quota_bucket,cadence_per_week,cadence_ceiling_per_week,unified_poster_active,source_table,active",
    ),
    sbRest<{ content_type: string; character: string; pool_n: number }[]>(
      "v_scheduler_pool?select=content_type,character,pool_n",
    ),
  ]);

  const poolByType = new Map(pools.map((p) => [`${p.content_type}|${p.character}`, p.pool_n]));

  const toLane = (r: (typeof registry)[number]): CadenceLane => ({
    contentType: r.content_type,
    sourceTable: r.source_table,
    bucket: r.quota_bucket,
    cadencePerWeek: r.cadence_per_week,
    ceilingPerWeek: r.cadence_ceiling_per_week,
    posterActive: r.unified_poster_active,
    poolNow:
      poolByType.get(`${r.content_type}|${r.character}`) ??
      poolByType.get(`${r.content_type}|All`) ??
      0,
    active: r.active,
    character: r.character,
  });

  const fillerRow = registry.find((r) => r.active && r.content_type === "filler");
  const fillerPerWeek = fillerRow?.cadence_per_week ?? 10;

  const glpActive = registry.filter(
    (r) => r.active && r.quota_bucket === "glp" && r.character.startsWith("Character"),
  );
  const characterNames = [...new Set(glpActive.map((r) => r.character))].sort();

  return {
    characters: characterNames.map((name) => {
      const lanes = glpActive
        .filter((r) => r.character === name)
        .sort((a, b) => (b.cadence_per_week ?? 0) - (a.cadence_per_week ?? 0))
        .map(toLane);
      return {
        name,
        lanes,
        glpSum: lanes.reduce((acc, l) => acc + (l.cadencePerWeek ?? 0), 0),
        fillerPerWeek,
      };
    }),
    retired: registry
      .filter((r) => !r.active)
      .sort((a, b) => a.character.localeCompare(b.character))
      .map(toLane),
  };
}

export const getCadence = cachedFetcher("cadence-data", TTL.supabase, fetchCadence);
