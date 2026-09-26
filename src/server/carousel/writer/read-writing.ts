import { sbRest } from "@/lib/data/supabase";

/** Batch retries use the saved Writing row, not whichever version is active now.
 * Binding to the registry's text key prevents another lane's instructions from
 * being used accidentally. This reader neither seeds nor activates Writing.
 */
export async function readPinnedWriting(writingVersionId: string, contentType: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(writingVersionId) ||
      typeof contentType !== "string" || !contentType.trim() || contentType.length > 200 || /[\u0000-\u001f\u007f]/.test(contentType)) {
    throw new Error("Invalid Writing identity");
  }
  const id = writingVersionId.toLowerCase();
  let result: unknown;
  try {
    result = await sbRest<unknown>(`carousel_lane_directions?id=eq.${id}&select=id,content_type,version,direction&limit=2`);
  } catch { throw new Error("Writing version could not be read"); }
  if (!Array.isArray(result) || result.length !== 1) throw new Error("Expected exactly one pinned Writing version");
  const row = result[0];
  if (!row || typeof row !== "object" || Array.isArray(row) || row.id !== id || row.content_type !== contentType ||
      !Number.isSafeInteger(row.version) || row.version < 1) throw new Error("Writing version identity mismatch");
  if (typeof row.direction !== "string" || !row.direction.trim()) throw new Error("Writing is required before generation");
  return { writingVersionId: id, contentType, direction: { version: row.version as number, text: row.direction as string } };
}
