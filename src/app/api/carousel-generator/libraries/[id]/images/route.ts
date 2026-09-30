import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { getImageRow, getLibraryRow, getSetRow } from "@/server/carousel/repo/libraries";
import { removeObject } from "@/server/carousel/repo/storage";
import { takeUpload } from "@/server/carousel/services/library-images";

const MADE_BY = new Set(["upload", "background_removal", "ai_edit"]);

/**
 * Upload, step two (DEV-29), and Keep: a file that has arrived in the
 * bucket becomes an image of the library. It lands in a set only when the
 * request names one. `discard: true` drops a pending file instead.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const library = await getLibraryRow(id);
  if (!library) return bad("Library not found", 404);
  if (library.readOnly) return bad("This library is read-only", 409);
  const b = await body(req);
  const path = str(b.path, 300);
  // Only a file this library was handed a link for, or one of its pending edits.
  if (!new RegExp(`^${id}/(incoming|pending)/[0-9a-f-]{36}\\.[a-z]{3,4}$`, "i").test(path)) return bad("Unknown upload", 400);
  if (b.discard === true) return attempt(g.email, "carousel.library.discard_pending", id, () => removeObject(path), { path });
  const setId = str(b.setId, 64) || null;
  if (setId) {
    const set = await getSetRow(setId);
    if (!set || set.library_id !== id) return bad("That set is not in this library", 409);
  }
  const madeBy = MADE_BY.has(str(b.madeBy, 40)) ? str(b.madeBy, 40) : "upload";
  const derivedFrom = str(b.derivedFrom, 64) || null;
  if (derivedFrom && !(await getImageRow(id, derivedFrom))) return bad("The original image is not in this library", 409);
  return attempt(
    g.email,
    madeBy === "upload" ? "carousel.library.upload" : "carousel.library.keep",
    id,
    async () => {
      const row = await takeUpload({ libraryId: id, setId, path, by: g.email, madeBy, derivedFrom, prompt: str(b.prompt, 1000) || null, keepAlpha: madeBy === "background_removal" });
      return { id: row.id, url: row.public_url };
    },
    { madeBy, setId },
  );
}

export const dynamic = "force-dynamic";
