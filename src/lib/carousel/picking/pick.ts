/** Database view boundary from DEV-01. No bank-specific table names leak here. */
export interface ImageAsset {
  library_id: string;
  image_id: string;
  public_url: string;
  is_cover: boolean;
  set_name: string | null;
  subset_name: string | null;
  luminance: number | null;
  status: string;
}
export interface PickingTemplate {
  slug: string;
  version: number;
  image_rules: Record<string, unknown>;
  slides: { n: number; cells: unknown[]; images: {
    rule: string; pools?: string[]; body_pools?: string[]; evidence_pools?: string[];
    prefer_cover?: boolean; distinct_group?: string;
  } }[];
}
export interface ImageManifest {
  deck_id: string;
  library_id: string;
  template: { slug: string; version: number };
  slides: { n: number; cells: { cell: number; image_id: string; public_url: string }[] }[];
}
export class ImagePickingError extends Error {
  constructor(readonly slide: number, message: string) { super(`slides[${slide}].images: ${message}`); }
}

// FNV-1a followed by Mulberry32: deterministic across JS runtimes, not Python parity.
function randomFor(seed: string) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => {
    let t = state = (state + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Pure DEV-06 selection. Persist this result before painting; retries must read
 * the saved manifest rather than call this again against a changed library.
 * Cells are zero-based in template order; slide numbers are never renumbered.
 */
export function pickImages(template: PickingTemplate, assets: readonly ImageAsset[], libraryId: string, deckId: string): ImageManifest {
  if (!deckId.trim() || !libraryId.trim()) throw new Error("deck_id and library_id are required");
  const random = randomFor(deckId);
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
  // Sorting before sampling makes view/query order irrelevant. URL, not row id,
  // defines distinctness because banks can contain duplicate image records.
  const library = assets.filter(a => a.library_id === libraryId && a.status === "active")
    .slice().sort((a, b) => compare(a.image_id, b.image_id) || compare(a.public_url, b.public_url));
  const ids = new Set<string>();
  for (const asset of library) {
    if (!asset.image_id.trim() || ids.has(asset.image_id)) throw new Error("image_assets.image_id: empty or duplicate id in selected library");
    ids.add(asset.image_id);
  }
  const groups = new Map<string, Set<string>>();
  const seenSlides = new Set<number>();
  const slides = template.slides.map(slide => {
    const fail = (message: string): never => { throw new ImagePickingError(slide.n, message); };
    if (!Number.isSafeInteger(slide.n) || slide.n < 1 || seenSlides.has(slide.n)) fail("invalid or duplicate original slide number");
    seenSlides.add(slide.n);
    if (!slide.cells.length) fail("no cells");
    const pools = (names?: string[]) => {
      if (names !== undefined && (!Array.isArray(names) || names.some(name => typeof name !== "string" || !name.trim()))) fail("invalid set binding");
      let matches = library;
      if (names?.length) {
        matches = [];
        for (const name of names) {
          if (!name.trim()) fail("empty set name");
          const members = library.filter(a => name === a.set_name || name === `${a.set_name}:${a.subset_name}`);
          if (!members.length) fail(`empty set "${name}" in library "${libraryId}"`);
          matches.push(...members);
        }
      }
      const unique = new Map<string, ImageAsset>();
      for (const asset of matches) {
        if (!asset.public_url.trim()) fail(`image "${asset.image_id}" has no URL`);
        // This is a manifest boundary, not an HTTP client. The fetch adapter
        // must additionally enforce its host/IP allowlist and redirect policy.
        let url: URL;
        try { url = new URL(asset.public_url); } catch { return fail(`image "${asset.image_id}" has an invalid URL`); }
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) fail(`image "${asset.image_id}" requires an HTTP(S) URL without credentials`);
        if (!unique.has(asset.public_url)) unique.set(asset.public_url, asset);
      }
      const candidates = [...unique.values()].sort((a, b) => compare(a.image_id, b.image_id) || compare(a.public_url, b.public_url));
      if (!candidates.length) fail(`empty library "${libraryId}"`);
      return candidates;
    };
    const config = slide.images;
    if (!Object.hasOwn(template.image_rules, config.rule)) fail(`unknown image rule "${config.rule}"`);
    let selected: ImageAsset[];
    if (config.rule === "diagonal_pairs") {
      if (slide.cells.length !== 4) fail("diagonal_pairs requires four cells");
      const rule = template.image_rules.diagonal_pairs as { luminance_tolerance?: unknown } | null;
      const tolerance = rule?.luminance_tolerance;
      if (typeof tolerance !== "number" || !Number.isFinite(tolerance) || tolerance < 0) fail("invalid luminance_tolerance");
      const pair = (candidates: ImageAsset[], category: boolean): [ImageAsset, ImageAsset] => {
        for (const asset of candidates) if (asset.luminance === null || !Number.isFinite(asset.luminance)) fail(`image "${asset.image_id}" missing numeric luminance`);
        const anchor = pick(candidates);
        if (candidates.length === 1) return [anchor, anchor];
        const rest = candidates.filter(a => a.public_url !== anchor.public_url);
        const distance = (a: ImageAsset) => Math.abs(a.luminance! - anchor.luminance!);
        let eligible = rest.filter(a => distance(a) <= (tolerance as number));
        if (eligible.length) {
          const varied = category ? eligible.filter(a => a.subset_name !== anchor.subset_name) : [];
          if (varied.length) eligible = varied;
        } else {
          const nearest = Math.min(...rest.map(distance));
          eligible = rest.filter(a => distance(a) === nearest);
        }
        return [anchor, pick(eligible)];
      };
      const evidence = pair(pools(config.evidence_pools), true);
      const body = pair(pools(config.body_pools), false);
      selected = random() < 0.5 ? [body[0], evidence[0], evidence[1], body[1]] : [evidence[0], body[0], body[1], evidence[1]];
    } else if (config.rule === "one" || config.rule === "distinct") {
      let candidates = pools(config.pools);
      if (config.prefer_cover && candidates.some(a => a.is_cover)) candidates = candidates.filter(a => a.is_cover);
      const used = config.distinct_group ? groups.get(config.distinct_group) ?? new Set<string>() : new Set<string>();
      selected = Array.from({ length: slide.cells.length }, () => {
        const fresh = candidates.filter(a => !used.has(a.public_url));
        const asset = pick(fresh.length ? fresh : candidates);
        if (config.rule === "distinct" || config.distinct_group) used.add(asset.public_url);
        return asset;
      });
      if (config.distinct_group) groups.set(config.distinct_group, used);
    } else return fail(`unsupported image rule "${config.rule}"`);
    return { n: slide.n, cells: selected.map((a, cell) => ({ cell, image_id: a.image_id, public_url: a.public_url })) };
  });
  return { deck_id: deckId, library_id: libraryId, template: { slug: template.slug, version: template.version }, slides };
}
