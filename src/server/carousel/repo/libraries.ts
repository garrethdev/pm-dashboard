/**
 * Image libraries: `image_libraries`, their sets, and the assets view that
 * unions the two banks with uploaded images.
 *
 * A linked library (a live folder in another bucket) is writable since
 * 2026-10-22 (Garreth): what a person adds, edits or generates is written
 * into the folder itself, and a row in `image_library_images` carries what
 * the folder cannot (prompt, who kept it, details, retired, cover). Only
 * the two bank libraries stay read-only.
 */
import { dbDelete, dbGet, dbGetAll, dbInsert, dbPatch, enc } from "@/server/carousel/repo/db";
import { LIBRARY_BUCKET, bucketUrl, forgetPictures, listPictures, moveObject, publicUrl, removeFolder, setFolders, writeObject } from "@/server/carousel/repo/storage";
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
  storage_path: string;
  details: Record<string, unknown> | null;
  set_id: string | null;
  made_by: string | null;
}

const L_COLS = "id,slug,name,source_bank,source_bucket,source_prefix,read_only,created_at";

/** Only the two seeded banks are read-only now (2026-10-22); the `read_only` column no longer decides. */
const readOnlyOf = (l: Pick<LibraryRow, "source_bank">) => Boolean(l.source_bank);

/** The id a linked picture carries on the page: the bucket and the path, which is all the folder knows. */
export const linkedId = (bucket: string, path: string) => `linked:${bucket}/${path}`;

/**
 * The pictures of a linked library, listed from the bucket now. A row, when
 * one exists for a path, says whether it is retired or the cover.
 */
async function linkedAssets(l: Pick<LibraryRow, "id" | "source_bucket" | "source_prefix">): Promise<ImageAsset[]> {
  if (!l.source_bucket) return [];
  const [files, rows] = await Promise.all([listPictures(l.source_bucket, l.source_prefix ?? ""), dbGetAll<{ storage_path: string; status: string; is_cover: boolean; luminance: number | null }>(`image_library_images?select=storage_path,status,is_cover,luminance&library_id=eq.${enc(l.id)}`)]);
  const byPath = new Map(rows.map((r) => [r.storage_path, r]));
  return files.map((f) => {
    const r = byPath.get(f.path);
    return { library_id: l.id, image_id: linkedId(l.source_bucket!, f.path), public_url: bucketUrl(l.source_bucket!, f.path), is_cover: r?.is_cover ?? false, set_name: f.set, subset_name: f.subset, luminance: r?.luminance ?? null, status: r?.status ?? "active" };
  });
}

export async function listAssets(libraryId: string): Promise<ImageAsset[]> {
  const rows = await dbGet<LibraryRow[]>(`image_libraries?select=${L_COLS}&id=eq.${enc(libraryId)}`);
  if (rows[0]?.source_bucket) return linkedAssets(rows[0]);
  return dbGetAll<ImageAsset>(`v_image_assets?select=library_id,image_id,public_url,is_cover,set_name,subset_name,luminance,status&library_id=eq.${enc(libraryId)}&order=image_id.asc`);
}

/** Sets a linked library gets from its folders: one per folder under the prefix, subfolders beneath. An empty folder is a set too. */
function linkedSets(libraryId: string, assets: ImageAsset[], folders: string[] = []): LibrarySet[] {
  const tops = new Map<string, number>();
  const subs = new Map<string, number>();
  for (const f of folders) {
    if (f.includes("/")) subs.set(f, 0);
    else tops.set(f, 0);
  }
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
  // Its rows (which the view also lists) only decorate the folder's files, so they are left out here.
  const linkedIds = new Set(libs.filter((l) => l.source_bucket).map((l) => l.id));
  const linked = await Promise.all(libs.filter((l) => l.source_bucket).map((l) => linkedAssets(l).catch((err: unknown) => { console.error(`linked library ${l.id} could not be listed`, err); return [] as ImageAsset[]; })));
  const assets = [...stored.filter((a) => !linkedIds.has(a.library_id)), ...linked.flat().filter((a) => a.status === "active")];
  return libs.map((l) => {
    const mine = assets.filter((a) => a.library_id === l.id);
    const cover = mine.find((a) => a.is_cover) ?? mine[0];
    return {
      id: l.id,
      slug: l.slug,
      name: l.name,
      readOnly: readOnlyOf(l),
      count: mine.length,
      cover: cover?.public_url ?? null,
      covers: [cover, ...mine.filter((a) => a !== cover)].filter((a): a is ImageAsset => Boolean(a)).slice(0, 3).map((a) => a.public_url),
      sets: l.source_bucket ? linkedSets(l.id, mine, setFolders(l.source_bucket, l.source_prefix ?? "")) : setsOf(l.id, sets, mine),
      usedBy: used.get(l.id) ?? [],
      untagged: l.source_bank ? 0 : mine.length,
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
    l.source_bank ? Promise.resolve([] as DetailsRow[]) : dbGetAll<DetailsRow>(`image_library_images?select=id,storage_path,details,set_id,made_by&library_id=eq.${enc(id)}`),
  ]);
  const active = assets.filter((a) => a.status === "active");
  const cover = active.find((a) => a.is_cover) ?? active[0];
  // A linked picture's row is found by its path; an uploaded one's by its id.
  const rowById = new Map(details.map((d) => [l.source_bucket ? linkedId(l.source_bucket, d.storage_path) : d.id, d]));
  const images: LibraryImage[] = assets.map((a) => ({
    id: a.image_id,
    url: a.public_url,
    setName: a.set_name,
    subsetName: a.subset_name,
    isCover: a.is_cover,
    luminance: a.luminance,
    status: a.status,
    details: rowById.get(a.image_id)?.details ?? null,
    setId: l.source_bucket ? (a.set_name ? `${l.id}:${a.set_name}${a.subset_name ? `/${a.subset_name}` : ""}` : null) : (rowById.get(a.image_id)?.set_id ?? null),
    madeBy: rowById.get(a.image_id)?.made_by ?? null,
  }));
  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    readOnly: readOnlyOf(l),
    count: active.length,
    cover: cover?.public_url ?? null,
    covers: [cover, ...active.filter((a) => a !== cover)].filter((a): a is ImageAsset => Boolean(a)).slice(0, 3).map((a) => a.public_url),
    sets: l.source_bucket ? linkedSets(l.id, active, setFolders(l.source_bucket, l.source_prefix ?? "")) : setsOf(l.id, sets, active),
    usedBy: used.get(l.id) ?? [],
    untagged: l.source_bank ? 0 : images.filter((i) => !i.details).length,
    linked: l.source_bucket ? { bucket: l.source_bucket, prefix: l.source_prefix ?? "" } : null,
    images,
  };
}

export async function createLibrary(name: string, by: string): Promise<Library> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "library";
  const [row] = await dbInsert<LibraryRow>("image_libraries", { slug: `${slug}-${Date.now().toString(36)}`, name, read_only: false, created_by: by });
  return { id: row.id, slug: row.slug, name: row.name, readOnly: false, count: 0, cover: null, covers: [], sets: [], usedBy: [], untagged: 0, linked: null };
}

/** A library that is a live link to a bucket folder (Garreth, 2026-10-08); the folder is listed each time. Writable since 2026-10-22. */
export async function createLinkedLibrary(name: string, bucket: string, prefix: string, by: string): Promise<Library> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "library";
  const clean = prefix.replace(/^\/+|\/+$/g, "");
  const [row] = await dbInsert<LibraryRow>("image_libraries", { slug: `${slug}-${Date.now().toString(36)}`, name, read_only: false, source_bucket: bucket, source_prefix: clean, created_by: by });
  forgetPictures(bucket, clean);
  const assets = await linkedAssets(row);
  const cover = assets[0];
  return { id: row.id, slug: row.slug, name: row.name, readOnly: false, count: assets.length, cover: cover?.public_url ?? null, covers: assets.slice(0, 3).map((a) => a.public_url), sets: linkedSets(row.id, assets, setFolders(bucket, clean)), usedBy: [], untagged: assets.length, linked: { bucket, prefix: clean } };
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

/**
 * A new set. In a library kept here it is a row; in a linked library it is
 * a folder, made by writing a hidden `.keep` file into it (the listing skips
 * names that start with a dot, so the file is never a picture).
 */
export async function createSet(library: LibraryRef, name: string, parentId: string | null): Promise<LibrarySet> {
  if (!library.linked) {
    const [row] = await dbInsert<SetRow>("image_library_sets", { library_id: library.id, parent_id: parentId, name });
    return { id: row.id, name: row.name, parentId: row.parent_id, count: 0 };
  }
  if (/[/\\]|\.\.|^\./.test(name)) throw new Error("A set name cannot hold a slash or start with a dot");
  const parent = parentId ? linkedSetFolder(library, parentId) : null;
  if (parent?.includes("/")) throw new Error("Sets nest one level deep");
  const folder = parent ? `${parent}/${name}` : name;
  await writeObject(linkedPath(library, folder, ".keep"), Buffer.alloc(0), "text/plain", library.bucket);
  forgetPictures(library.bucket, library.prefix);
  return { id: `${library.id}:${folder}`, name, parentId, count: 0 };
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
  /** Which bucket `storage_path` is in: the library bucket, or a linked library's own. */
  bucket: string;
}

const I_COLS = "id,library_id,set_id,storage_path,public_url,is_cover,status,luminance,derived_from,made_by,width,height";

/** What a route needs to know about a library before it writes to it. */
export interface LibraryRef {
  id: string;
  name: string;
  readOnly: boolean;
  /** A live folder in another bucket (2026-10-08), writable since 2026-10-22. */
  linked: boolean;
  bucket: string;
  /** Where this library's pictures live inside the bucket: its id, or the linked folder. */
  prefix: string;
}

export async function getLibraryRow(id: string): Promise<LibraryRef | null> {
  const rows = await dbGet<LibraryRow[]>(`image_libraries?select=${L_COLS}&id=eq.${enc(id)}`);
  const l = rows[0];
  if (!l) return null;
  return { id: l.id, name: l.name, readOnly: readOnlyOf(l), linked: Boolean(l.source_bucket), bucket: l.source_bucket ?? LIBRARY_BUCKET, prefix: l.source_bucket ? (l.source_prefix ?? "") : l.id };
}

/** A linked set's id is `<library id>:<folder>`; the folder is "name" or "name/sub". */
export function linkedSetFolder(library: Pick<LibraryRef, "id">, setId: string): string {
  const head = `${library.id}:`;
  const folder = setId.startsWith(head) ? setId.slice(head.length) : "";
  if (!/^[^/]+(\/[^/]+)?$/.test(folder) || /(^|\/)\.\.?(\/|$)/.test(folder)) throw new Error("That set is not in this library");
  return folder;
}

/** A path inside a linked library's bucket: the prefix, the set folder when there is one, the file. */
export function linkedPath(library: Pick<LibraryRef, "prefix">, folder: string | null, name: string): string {
  return [library.prefix, folder, name].filter(Boolean).join("/");
}

/** The public link to a picture in whichever bucket a library keeps it. */
export function pictureUrl(bucket: string, path: string): string {
  return bucket === LIBRARY_BUCKET ? publicUrl(path) : bucketUrl(bucket, path);
}

export async function getSetRow(id: string): Promise<SetRow | null> {
  const rows = await dbGet<SetRow[]>(`image_library_sets?select=id,library_id,parent_id,name&id=eq.${enc(id)}`);
  return rows[0] ?? null;
}

/**
 * One image as a row. An uploaded picture's id is its row. A linked
 * picture's id is its bucket and path; its row is found by the path, and
 * made on first touch, so a folder picture can be retired, covered, edited
 * or read like any other. The two banks' images are not rows at all.
 */
export async function getImageRow(library: LibraryRef, imageId: string): Promise<ImageRow | null> {
  if (/^[0-9a-f-]{36}$/i.test(imageId)) {
    const rows = await dbGet<ImageRow[]>(`image_library_images?select=${I_COLS}&id=eq.${enc(imageId)}&library_id=eq.${enc(library.id)}`);
    return rows[0] ? { ...rows[0], bucket: library.bucket } : null;
  }
  if (!library.linked) return null;
  const head = `linked:${library.bucket}/`;
  if (!imageId.startsWith(head)) return null;
  const path = imageId.slice(head.length);
  if (!path || path.includes("..") || (library.prefix && !path.startsWith(`${library.prefix}/`))) return null;
  const rows = await dbGet<ImageRow[]>(`image_library_images?select=${I_COLS}&library_id=eq.${enc(library.id)}&storage_path=eq.${enc(path)}`);
  if (rows[0]) return { ...rows[0], bucket: library.bucket };
  const [made] = await dbInsert<ImageRow>("image_library_images", { library_id: library.id, set_id: null, storage_path: path, public_url: bucketUrl(library.bucket, path), made_by: null, kept_by: null }, { upsert: "library_id,storage_path" });
  return { ...made, bucket: library.bucket };
}

export async function addImage(input: {
  libraryId: string;
  setId: string | null;
  path: string;
  /** The bucket the path is in; the library bucket when not named. */
  bucket?: string;
  luminance: number | null;
  width: number | null;
  height: number | null;
  derivedFrom?: string | null;
  madeBy?: string | null;
  prompt?: string | null;
  by: string;
  /** Set when the picture went through the degrade pass: the seed it used. */
  degradeSeed?: string | null;
}): Promise<ImageRow> {
  const bucket = input.bucket ?? LIBRARY_BUCKET;
  const [row] = await dbInsert<ImageRow>("image_library_images", {
    library_id: input.libraryId,
    set_id: input.setId,
    storage_path: input.path,
    public_url: pictureUrl(bucket, input.path),
    luminance: input.luminance,
    width: input.width,
    height: input.height,
    derived_from: input.derivedFrom ?? null,
    made_by: input.madeBy ?? "upload",
    prompt: input.prompt ?? null,
    kept_by: input.by,
    // Only named when set, so every other image is saved as it was before.
    ...(input.degradeSeed ? { degraded: true, degrade_seed: input.degradeSeed } : {}),
  });
  return { ...row, bucket };
}

/** One cover per library: the old one steps down first, so the index lets the new one in. */
export async function makeCover(libraryId: string, imageId: string): Promise<void> {
  await dbPatch(`image_library_images?library_id=eq.${enc(libraryId)}&is_cover=eq.true`, { is_cover: false });
  await dbPatch(`image_library_images?id=eq.${enc(imageId)}&library_id=eq.${enc(libraryId)}`, { is_cover: true });
}

/** Move to another set: a row change here, a move between folders in a linked library. */
export async function moveImage(library: LibraryRef, row: ImageRow, setId: string | null): Promise<void> {
  if (!library.linked) {
    await dbPatch(`image_library_images?id=eq.${enc(row.id)}&library_id=eq.${enc(library.id)}`, { set_id: setId });
    return;
  }
  const folder = setId ? linkedSetFolder(library, setId) : null;
  const to = linkedPath(library, folder, row.storage_path.split("/").pop() ?? row.storage_path);
  if (to === row.storage_path) return;
  await moveObject(library.bucket, row.storage_path, to);
  await dbPatch(`image_library_images?id=eq.${enc(row.id)}&library_id=eq.${enc(library.id)}`, { storage_path: to, public_url: bucketUrl(library.bucket, to) });
  forgetPictures(library.bucket, library.prefix);
}

/** The details AI vision read off a picture (DEV-41), written whole. */
export async function setImageDetails(libraryId: string, imageId: string, details: Record<string, unknown>): Promise<void> {
  await dbPatch(`image_library_images?id=eq.${enc(imageId)}&library_id=eq.${enc(libraryId)}`, { details });
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
