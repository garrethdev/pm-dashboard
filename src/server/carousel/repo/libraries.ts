/**
 * Image libraries: `image_libraries`, their sets, and the assets view that
 * unions the two banks with uploaded images.
 */
import { dbDelete, dbGet, dbGetAll, dbInsert, dbPatch, enc } from "@/server/carousel/repo/db";
import { bucketUrl, forgetPictures, listPictures, publicUrl, removeFolder } from "@/server/carousel/repo/storage";
import type { ImageAsset } from "@/lib/carousel/picking/pick";
import type { Library, LibraryDetail, LibraryImage, LibrarySet } from "@/server/carousel/repo/types";

interface LibraryRow {
  id: string;
  slug: string;
  name: string;
  source_bank: string | null;
  /** A live link to a folder in a bucket (2026-10-08); read-only here. */
  source_bucket: string | null;
  source_prefix: string | null;
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
  set_id: string | null;
  made_by: string | null;
}

const L_COLS = "id,slug,name,source_bank,source_bucket,source_prefix,read_only,created_at";

/** The pictures of a linked library, listed from the bucket now. */
async function linkedAssets(l: Pick<LibraryRow, "id" | "source_bucket" | "source_prefix">): Promise<ImageAsset[]> {
  if (!l.source_bucket) return [];
  const files = await listPictures(l.source_bucket, l.source_prefix ?? "");
  return files.map((f) => ({ library_id: l.id, image_id: `linked:${l.source_bucket}/${f.path}`, public_url: bucketUrl(l.source_bucket!, f.path), is_cover: false, set_name: f.set, subset_name: f.subset, luminance: null, status: "active" }));
}

export async function listAssets(libraryId: string): Promise<ImageAsset[]> {
  const rows = await dbGet<LibraryRow[]>(`image_libraries?select=${L_COLS}&id=eq.${enc(libraryId)}`);
  if (rows[0]?.source_bucket) return linkedAssets(rows[0]);
  return dbGetAll<ImageAsset>(`v_image_assets?select=library_id,image_id,public_url,is_cover,set_name,subset_name,luminance,status&library_id=eq.${enc(libraryId)}&order=image_id.asc`);
}

/** Sets a linked library gets from its folders: one per folder under the prefix, subfolders beneath. */
function linkedSets(libraryId: string, assets: ImageAsset[]): LibrarySet[] {
  const tops = new Map<string, number>();
  const subs = new Map<string, number>();
  for (const a of assets) {
    if (!a.set_name) continue;
    tops.set(a.set_name, (tops.get(a.set_name) ?? 0) + 1);
    if (a.subset_name) subs.set(`${a.set_name}/${a.subset_name}`, (subs.get(`${a.set_name}/${a.subset_name}`) ?? 0) + 1);
  }
  const out: LibrarySet[] = [];
  for (const [name, count] of [...tops].sort(([a], [b]) => a.localeCompare(b))) {
    const id = `${libraryId}:${name}`;
    out.push({ id, name, parentId: null, count });
    for (const [key, n] of [...subs].filter(([k]) => k.startsWith(`${name}/`)).sort(([a], [b]) => a.localeCompare(b))) out.push({ id: `${libraryId}:${key}`, name: key.slice(name.length + 1), parentId: id, count: n });
  }
  return out;
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
  const [libs, sets, stored, used] = await Promise.all([
    dbGetAll<LibraryRow>(`image_libraries?select=${L_COLS}&order=created_at.asc`),
    dbGetAll<SetRow>("image_library_sets?select=id,library_id,parent_id,name"),
    dbGetAll<ImageAsset>("v_image_assets?select=library_id,image_id,public_url,is_cover,set_name,subset_name,luminance,status&status=eq.active"),
    usedBy(),
  ]);
  // A linked library's pictures come from its bucket; a folder that cannot be listed shows as empty rather than failing the page.
  const linked = await Promise.all(libs.filter((l) => l.source_bucket).map((l) => linkedAssets(l).catch((err: unknown) => { console.error(`linked library ${l.id} could not be listed`, err); return [] as ImageAsset[]; })));
  const assets = [...stored, ...linked.flat()];
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
      covers: [cover, ...mine.filter((a) => a !== cover)].filter((a): a is ImageAsset => Boolean(a)).slice(0, 3).map((a) => a.public_url),
      sets: l.source_bucket ? linkedSets(l.id, mine) : setsOf(l.id, sets, mine),
      usedBy: used.get(l.id) ?? [],
      untagged: l.source_bank || l.source_bucket ? 0 : mine.length,
      linked: l.source_bucket ? { bucket: l.source_bucket, prefix: l.source_prefix ?? "" } : null,
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
    l.source_bank || l.source_bucket ? Promise.resolve([] as DetailsRow[]) : dbGetAll<DetailsRow>(`image_library_images?select=id,details,set_id,made_by&library_id=eq.${enc(id)}`),
  ]);
  const active = assets.filter((a) => a.status === "active");
  const cover = active.find((a) => a.is_cover) ?? active[0];
  const rowById = new Map(details.map((d) => [d.id, d]));
  const images: LibraryImage[] = assets.map((a) => ({
    id: a.image_id,
    url: a.public_url,
    setName: a.set_name,
    subsetName: a.subset_name,
    isCover: a.is_cover,
    luminance: a.luminance,
    status: a.status,
    details: rowById.get(a.image_id)?.details ?? null,
    setId: rowById.get(a.image_id)?.set_id ?? null,
    madeBy: rowById.get(a.image_id)?.made_by ?? null,
  }));
  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    readOnly: l.read_only,
    count: active.length,
    cover: cover?.public_url ?? null,
    covers: [cover, ...active.filter((a) => a !== cover)].filter((a): a is ImageAsset => Boolean(a)).slice(0, 3).map((a) => a.public_url),
    sets: l.source_bucket ? linkedSets(l.id, active) : setsOf(l.id, sets, active),
    usedBy: used.get(l.id) ?? [],
    untagged: l.source_bank || l.source_bucket ? 0 : images.filter((i) => !i.details).length,
    linked: l.source_bucket ? { bucket: l.source_bucket, prefix: l.source_prefix ?? "" } : null,
    images,
  };
}

export async function createLibrary(name: string, by: string): Promise<Library> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "library";
  const [row] = await dbInsert<LibraryRow>("image_libraries", { slug: `${slug}-${Date.now().toString(36)}`, name, read_only: false, created_by: by });
  return { id: row.id, slug: row.slug, name: row.name, readOnly: false, count: 0, cover: null, covers: [], sets: [], usedBy: [], untagged: 0, linked: null };
}

/** A library that is a live link to a bucket folder (Garreth, 2026-10-08). Read-only; the folder is listed each time. */
export async function createLinkedLibrary(name: string, bucket: string, prefix: string, by: string): Promise<Library> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "library";
  const clean = prefix.replace(/^\/+|\/+$/g, "");
  const [row] = await dbInsert<LibraryRow>("image_libraries", { slug: `${slug}-${Date.now().toString(36)}`, name, read_only: true, source_bucket: bucket, source_prefix: clean, created_by: by });
  forgetPictures(bucket, clean);
  const assets = await linkedAssets(row);
  const cover = assets[0];
  return { id: row.id, slug: row.slug, name: row.name, readOnly: true, count: assets.length, cover: cover?.public_url ?? null, covers: assets.slice(0, 3).map((a) => a.public_url), sets: linkedSets(row.id, assets), usedBy: [], untagged: 0, linked: { bucket, prefix: clean } };
}

/**
 * Deleting a library. Refused while a carousel type draws from it (the
 * type would lose its pictures) and for the two seeded banks. A library
 * made here loses its rows and its files in the bucket; a linked library
 * loses only the link, never the folder.
 */
export async function deleteLibrary(id: string): Promise<{ removedFiles: number }> {
  const rows = await dbGet<LibraryRow[]>(`image_libraries?select=${L_COLS}&id=eq.${enc(id)}`);
  const l = rows[0];
  if (!l) throw new Error("Library not found");
  if (l.source_bank) throw new Error("The two bank libraries cannot be deleted");
  const used = (await usedBy()).get(id) ?? [];
  if (used.length) throw new Error(`${used.length === 1 ? "A carousel type draws" : `${used.length} carousel types draw`} from this library: ${used.join(", ")}. Point ${used.length === 1 ? "it" : "them"} at another library first.`);
  let removedFiles = 0;
  if (!l.source_bucket) removedFiles = await removeFolder(id);
  await dbDelete(`image_libraries?id=eq.${enc(id)}`);
  return { removedFiles };
}

export async function createSet(libraryId: string, name: string, parentId: string | null): Promise<LibrarySet> {
  const [row] = await dbInsert<SetRow>("image_library_sets", { library_id: libraryId, parent_id: parentId, name });
  return { id: row.id, name: row.name, parentId: row.parent_id, count: 0 };
}

// ── DEV-29: images a person added ───────────────────────────────────────

export interface ImageRow {
  id: string;
  library_id: string;
  set_id: string | null;
  storage_path: string;
  public_url: string | null;
  is_cover: boolean;
  status: "active" | "retired";
  luminance: number | null;
  derived_from: string | null;
  made_by: string | null;
  width: number | null;
  height: number | null;
}

const I_COLS = "id,library_id,set_id,storage_path,public_url,is_cover,status,luminance,derived_from,made_by,width,height";

export async function getLibraryRow(id: string): Promise<{ id: string; name: string; readOnly: boolean } | null> {
  const rows = await dbGet<LibraryRow[]>(`image_libraries?select=${L_COLS}&id=eq.${enc(id)}`);
  return rows[0] ? { id: rows[0].id, name: rows[0].name, readOnly: rows[0].read_only } : null;
}

export async function getSetRow(id: string): Promise<SetRow | null> {
  const rows = await dbGet<SetRow[]>(`image_library_sets?select=id,library_id,parent_id,name&id=eq.${enc(id)}`);
  return rows[0] ?? null;
}

export async function getImageRow(libraryId: string, imageId: string): Promise<ImageRow | null> {
  // The two bank libraries' images are not rows here; their ids carry a prefix.
  if (!/^[0-9a-f-]{36}$/i.test(imageId)) return null;
  const rows = await dbGet<ImageRow[]>(`image_library_images?select=${I_COLS}&id=eq.${enc(imageId)}&library_id=eq.${enc(libraryId)}`);
  return rows[0] ?? null;
}

export async function addImage(input: {
  libraryId: string;
  setId: string | null;
  path: string;
  luminance: number | null;
  width: number | null;
  height: number | null;
  derivedFrom?: string | null;
  madeBy?: string | null;
  prompt?: string | null;
  by: string;
}): Promise<ImageRow> {
  const [row] = await dbInsert<ImageRow>("image_library_images", {
    library_id: input.libraryId,
    set_id: input.setId,
    storage_path: input.path,
    public_url: publicUrl(input.path),
    luminance: input.luminance,
    width: input.width,
    height: input.height,
    derived_from: input.derivedFrom ?? null,
    made_by: input.madeBy ?? "upload",
    prompt: input.prompt ?? null,
    kept_by: input.by,
  });
  return row;
}

/** One cover per library: the old one steps down first, so the index lets the new one in. */
export async function makeCover(libraryId: string, imageId: string): Promise<void> {
  await dbPatch(`image_library_images?library_id=eq.${enc(libraryId)}&is_cover=eq.true`, { is_cover: false });
  await dbPatch(`image_library_images?id=eq.${enc(imageId)}&library_id=eq.${enc(libraryId)}`, { is_cover: true });
}

export async function moveImage(libraryId: string, imageId: string, setId: string | null): Promise<void> {
  await dbPatch(`image_library_images?id=eq.${enc(imageId)}&library_id=eq.${enc(libraryId)}`, { set_id: setId });
}

/**
 * Retire (a hold): the image drops out of new picks. A manifest already
 * saved keeps its link, because the file is left where it is.
 */
export async function setImageStatus(libraryId: string, imageId: string, status: "active" | "retired", by: string): Promise<void> {
  await dbPatch(`image_library_images?id=eq.${enc(imageId)}&library_id=eq.${enc(libraryId)}`, {
    status,
    ...(status === "retired" ? { is_cover: false, retired_at: new Date().toISOString(), retired_by: by } : { retired_at: null, retired_by: null }),
  });
}
