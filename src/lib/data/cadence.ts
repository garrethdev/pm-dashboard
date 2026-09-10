import { TTL, cachedFetcher } from "@/lib/data/cache";
import { sbRest } from "@/lib/data/supabase";

/**
 * Cadence (plan §6) — content_type_registry grouped by character, with each
 * character's GLP mix and the caps that mix has to add up to.
 *
 * There is no single fleet cadence any more. The scheduler resolves
 *   fleet default -> character override -> account override -> age ramp -> health
 * and Character 5 (2026-09-10) is the first character to sit off the fleet
 * default: 7 GLP a week against the fleet's 11, and no filler lane at all.
 * Everything here therefore carries BOTH the raw override (null = inherits)
 * and enough to resolve the effective number once the fleet defaults are known.
 *
 * Storage gotcha, same as the per-account override: a character's caps live on
 * THREE rows keyed by bucket —
 *   bucket = null     -> max_posts_per_day
 *   bucket = 'glp'    -> weekly_cap
 *   bucket = 'filler' -> weekly_cap
 * A row that does not exist is not "zero", it is "inherit the fleet". Keeping
 * those apart is the whole point: write a row for every character and changing
 * one fleet number stops moving anyone.
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

/** Raw character-scope override. null on a field = inherits the fleet default. */
export interface CharacterOverride {
  maxPostsPerDay: number | null;
  glpWeekCap: number | null;
  fillerWeekCap: number | null;
}

export const NO_OVERRIDE: CharacterOverride = {
  maxPostsPerDay: null,
  glpWeekCap: null,
  fillerWeekCap: null,
};

export interface CadenceCharacter {
  name: string;
  lanes: CadenceLane[];
  glpSum: number;
  override: CharacterOverride;
}

export interface CadenceData {
  /** Active GLP lanes grouped per character. */
  characters: CadenceCharacter[];
  retired: CadenceLane[];
}

/** The fleet numbers a character falls back to, field by field. */
export interface CadenceFallback {
  maxPostsPerDay: number;
  glpWeek: number;
  fillerWeek: number;
}

/** What a character actually posts to: its own override where set, else fleet. */
export function resolveCharacterCaps(
  override: CharacterOverride,
  fleet: CadenceFallback,
): CadenceFallback {
  return {
    maxPostsPerDay: override.maxPostsPerDay ?? fleet.maxPostsPerDay,
    glpWeek: override.glpWeekCap ?? fleet.glpWeek,
    fillerWeek: override.fillerWeekCap ?? fleet.fillerWeek,
  };
}

interface RawCharacterOverride {
  scope_key: string;
  bucket: string | null;
  weekly_cap: number | null;
  max_posts_per_day: number | null;
  active: boolean;
}

/** Collapse a character's per-bucket rows into one setting. Inactive rows are
 *  ignored — switching an override off has to read as "inherit", not as 0. */
function foldCharacterRows(rows: RawCharacterOverride[]): CharacterOverride {
  const live = rows.filter((r) => r.active);
  return {
    maxPostsPerDay: live.find((r) => r.bucket === null)?.max_posts_per_day ?? null,
    glpWeekCap: live.find((r) => r.bucket === "glp")?.weekly_cap ?? null,
    fillerWeekCap: live.find((r) => r.bucket === "filler")?.weekly_cap ?? null,
  };
}

/** Un-cached read — callers inside a cached fetcher, and the API route, share it. */
export async function fetchCharacterOverrides(): Promise<Record<string, CharacterOverride>> {
  const rows = await sbRest<RawCharacterOverride[]>(
    "scheduler_overrides?select=scope_key,bucket,weekly_cap,max_posts_per_day,active&scope=eq.character",
  );
  const byCharacter: Record<string, RawCharacterOverride[]> = {};
  for (const r of rows) (byCharacter[r.scope_key] ??= []).push(r);

  const out: Record<string, CharacterOverride> = {};
  for (const [name, group] of Object.entries(byCharacter)) out[name] = foldCharacterRows(group);
  return out;
}

async function fetchCadence(): Promise<CadenceData> {
  const [registry, pools, overrides] = await Promise.all([
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
    fetchCharacterOverrides(),
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
        override: overrides[name] ?? NO_OVERRIDE,
      };
    }),
    retired: registry
      .filter((r) => !r.active)
      .sort((a, b) => a.character.localeCompare(b.character))
      .map(toLane),
  };
}

export const getCadence = cachedFetcher("cadence-data", TTL.supabase, fetchCadence);
