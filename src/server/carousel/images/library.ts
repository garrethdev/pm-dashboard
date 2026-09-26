import { sbRestAll } from "@/lib/data/supabase";
import { pickImages, type ImageAsset, type PickingTemplate } from "@/lib/carousel/picking/pick";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nullableText = (v: unknown) => v === null || typeof v === "string";

/** DEV-06 server boundary. Read the existing union view, never mutate source banks.
 * Reject malformed rows instead of silently changing the seeded candidate pool.
 */
export async function readImageLibrary(libraryId: string): Promise<ImageAsset[]> {
  if (!uuid.test(libraryId)) throw new Error("Invalid image library ID");
  const id = libraryId.toLowerCase();
  let rows: unknown;
  try {
    rows = await sbRestAll<unknown>(`v_image_assets?library_id=eq.${id}&status=eq.active&select=library_id,image_id,public_url,is_cover,set_name,subset_name,luminance,status&order=image_id.asc`, { maxRows: 20_000 });
  } catch { throw new Error("Image library could not be read"); }
  if (!Array.isArray(rows)) throw new Error("Invalid image library response");
  const seen = new Set<string>();
  return rows.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid image library row");
    const row = value as Record<string, unknown>;
    // Existing banks may expose integer or text identities; normalize safely.
    const imageId = typeof row.image_id === "string" ? row.image_id :
      typeof row.image_id === "number" && Number.isSafeInteger(row.image_id) ? String(row.image_id) : "";
    let url: URL;
    try { url = new URL(typeof row.public_url === "string" ? row.public_url : ""); }
    catch { throw new Error("Invalid image library URL"); }
    if (row.library_id !== id || row.status !== "active" || !imageId.trim() || seen.has(imageId) ||
        typeof row.is_cover !== "boolean" || !nullableText(row.set_name) || !nullableText(row.subset_name) ||
        !(row.luminance === null || typeof row.luminance === "number" && Number.isFinite(row.luminance)) ||
        !["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid image library row");
    seen.add(imageId);
    return { library_id: id, image_id: imageId, public_url: row.public_url as string,
      is_cover: row.is_cover, set_name: row.set_name as string | null,
      subset_name: row.subset_name as string | null, luminance: row.luminance as number | null, status: "active" };
  });
}

/** Proposal only: callers must atomically persist the manifest before rendering.
 * Render retries must load that saved manifest, not reselect a changed library.
 */
export async function proposeImageManifest(template: PickingTemplate, libraryId: string, deckId: string) {
  return pickImages(template, await readImageLibrary(libraryId), libraryId.toLowerCase(), deckId);
}
