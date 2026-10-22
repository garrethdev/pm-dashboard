import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { getImageRow, getLibraryRow, getSetRow, linkedSetFolder } from "@/server/carousel/repo/libraries";
import { removeObject } from "@/server/carousel/repo/storage";
import { takeUpload } from "@/server/carousel/services/library-images";

const MADE_BY = new Set(["upload", "background_removal", "ai_edit", "generated"]);

/**
 * Upload, step two (DEV-29), and Keep (an AI edit, or a generated picture,
 * DEV-30): a file that has arrived in the bucket becomes an image of the
 * library. It lands in a set only when the request names one.
 * `discard: true` drops a pending or incoming file instead.
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
  // Only a file this library was handed a link for, or one of its pending pictures.
  if (!new RegExp(`^${id}/(incoming|pending)/[0-9a-f-]{36}\\.[a-z]{3,4}$`, "i").test(path)) return bad("Unknown upload", 400);
  if (b.discard === true) return attempt(g.email, "carousel.library.discard_pending", id, () => removeObject(path), { path });
  const setId = str(b.setId, 200) || null;
  if (setId) {
    if (library.linked) {
      try {
        linkedSetFolder(library, setId);
      } catch {
        return bad("That set is not in this library", 409);
      }
    } else {
      const set = await getSetRow(setId);
      if (!set || set.library_id !== id) return bad("That set is not in this library", 409);
    }
  }
  const madeBy = MADE_BY.has(str(b.madeBy, 40)) ? str(b.madeBy, 40) : "upload";
  const from = str(b.derivedFrom, 300) || null;
  const original = from ? await getImageRow(library, from) : null;
  if (from && !original) return bad("The original image is not in this library", 409);
  return attempt(
    g.email,
    madeBy === "upload" ? "carousel.library.upload" : "carousel.library.keep",
    id,
    async () => {
      const row = await takeUpload({ library, setId, path, by: g.email, madeBy, derivedFrom: original?.id ?? null, prompt: str(b.prompt, 1000) || null, keepAlpha: madeBy === "background_removal" });
      return { id: row.id, url: row.public_url };
    },
    { madeBy, setId },
  );
}

export const dynamic = "force-dynamic";
