/**
 * Image libraries: `image_libraries`, their sets, and the assets view that
 * unions the two banks with uploaded images.
 */
import { dbGet, dbGetAll, dbInsert, enc } from "@/server/carousel/repo/db";
import type { ImageAsset } from "@/lib/carousel/picking/pick";
import type { Library, LibraryDetail, LibraryImage, LibrarySet } from "@/server/carousel/repo/types";

interface LibraryRow {
  id: string;
  slug: string;
  name: string;
  source_bank: string | null;
  read_only: boolean;
  created_at: string;
}

interface SetRow {
  id: string;
  library_id: string;
  parent_id: string | null;
  name: string;
}

interface DetailsRow {
  id: string;
  details: Record<string, unknown> | null;
}

const L_COLS = "id,slug,name,source_bank,read_only,created_at";

export async function listAssets(libraryId: string): Promise<ImageAsset[]> {
  return dbGetAll<ImageAsset>(`v_image_assets?select=library_id,image_id,public_url,is_cover,set_name,subset_name,luminance,status&library_id=eq.${enc(libraryId)}&order=image_id.asc`);
}

async function usedBy(): Promise<Map<string, string[]>> {
  const rows = await dbGetAll<{ library_id: string | null; name: string }>("carousel_templates?select=library_id,name&status=neq.archived");
  const map = new Map<string, string[]>();
  for (const r of rows) if (r.library_id) map.set(r.library_id, [...(map.get(r.library_id) ?? []), r.name]);
  return map;
}

function setsOf(libraryId: string, sets: SetRow[], assets: ImageAsset[]): LibrarySet[] {
  return sets
    .filter((s) => s.library_id === libraryId)
    .map((s) => {
      const parent = s.parent_id ? sets.find((p) => p.id === s.parent_id) : null;
      const count = parent
        ? assets.filter((a) => a.set_name === parent.name && a.subset_name === s.name).length
        : assets.filter((a) => a.set_name === s.name).length;
      return { id: s.id, name: s.name, parentId: s.parent_id, count };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listLibraries(): Promise<Library[]> {
  const [libs, sets, assets, used] = await Promise.all([
    dbGetAll<LibraryRow>(`image_libraries?select=${L_COLS}&order=created_at.asc`),
    dbGetAll<SetRow>("image_library_sets?select=id,library_id,parent_id,name"),
    dbGetAll<ImageAsset>("v_image_assets?select=library_id,image_id,public_url,is_cover,set_name,subset_name,luminance,status&status=eq.active"),
    usedBy(),
  ]);
  return libs.map((l) => {
    const mine = assets.filter((a) => a.library_id === l.id);
    const cover = mine.find((a) => a.is_cover) ?? mine[0];
    return {
      id: l.id,
      slug: l.slug,
      name: l.name,
      readOnly: l.read_only,
      count: mine.length,
      cover: cover?.public_url ?? null,
      sets: setsOf(l.id, sets, mine),
      usedBy: used.get(l.id) ?? [],
      untagged: l.source_bank ? 0 : mine.length,
    };
  });
}

export async function getLibrary(id: string): Promise<LibraryDetail | null> {
  const rows = await dbGet<LibraryRow[]>(`image_libraries?select=${L_COLS}&id=eq.${enc(id)}`);
  const l = rows[0];
  if (!l) return null;
  const [sets, assets, used, details] = await Promise.all([
    dbGetAll<SetRow>(`image_library_sets?select=id,library_id,parent_id,name&library_id=eq.${enc(id)}`),
    listAssets(id),
    usedBy(),
    l.source_bank ? Promise.resolve([] as DetailsRow[]) : dbGetAll<DetailsRow>(`image_library_images?select=id,details&library_id=eq.${enc(id)}`),
  ]);
  const active = assets.filter((a) => a.status === "active");
  const cover = active.find((a) => a.is_cover) ?? active[0];
  const detailsById = new Map(details.map((d) => [d.id, d.details]));
  const images: LibraryImage[] = assets.map((a) => ({
    id: a.image_id,
    url: a.public_url,
    setName: a.set_name,
    subsetName: a.subset_name,
    isCover: a.is_cover,
    luminance: a.luminance,
    status: a.status,
    details: detailsById.get(a.image_id) ?? null,
  }));
  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    readOnly: l.read_only,
    count: active.length,
    cover: cover?.public_url ?? null,
    sets: setsOf(l.id, sets, active),
    usedBy: used.get(l.id) ?? [],
    untagged: l.source_bank ? 0 : images.filter((i) => !i.details).length,
    images,
  };
}

export async function createLibrary(name: string, by: string): Promise<Library> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "library";
  const [row] = await dbInsert<LibraryRow>("image_libraries", { slug: `${slug}-${Date.now().toString(36)}`, name, read_only: false, created_by: by });
  return { id: row.id, slug: row.slug, name: row.name, readOnly: false, count: 0, cover: null, sets: [], usedBy: [], untagged: 0 };
}

export async function createSet(libraryId: string, name: string, parentId: string | null): Promise<LibrarySet> {
  const [row] = await dbInsert<SetRow>("image_library_sets", { library_id: libraryId, parent_id: parentId, name });
  return { id: row.id, name: row.name, parentId: row.parent_id, count: 0 };
}
