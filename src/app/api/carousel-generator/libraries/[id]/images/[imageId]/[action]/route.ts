import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { getImageRow, getLibraryRow, getSetRow, makeCover, moveImage, setImageStatus } from "@/server/carousel/repo/libraries";
import { publicUrl } from "@/server/carousel/repo/storage";
import { aiEdit, blackAndWhite } from "@/server/carousel/services/library-images";

/**
 * One image's presses (DEV-29): Make cover, Move to another set, Black and
 * white, AI edit, Retire (a hold on the page) and Restore. The two bank
 * libraries are read-only, so none of these reach them.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; imageId: string; action: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id, imageId, action } = await params;
  const library = await getLibraryRow(id);
  if (!library) return bad("Library not found", 404);
  if (library.readOnly) return bad("This library is read-only", 409);
  const image = await getImageRow(id, imageId);
  if (!image) return bad("Image not found", 404);
  const b = await body(req);
  const retired = image.status === "retired";
  switch (action) {
    case "cover":
      if (retired) return bad("A retired image cannot be the cover", 409);
      return attempt(g.email, "carousel.library.cover", imageId, () => makeCover(id, imageId));
    case "move": {
      const setId = str(b.setId, 64) || null;
      if (setId) {
        const set = await getSetRow(setId);
        if (!set || set.library_id !== id) return bad("That set is not in this library", 409);
      }
      return attempt(g.email, "carousel.library.move", imageId, () => moveImage(id, imageId, setId), { setId });
    }
    case "retire":
      if (retired) return bad("Already retired", 409);
      return attempt(g.email, "carousel.library.retire", imageId, () => setImageStatus(id, imageId, "retired", g.email));
    case "restore":
      if (!retired) return bad("The image is not retired", 409);
      return attempt(g.email, "carousel.library.restore", imageId, () => setImageStatus(id, imageId, "active", g.email));
    case "black-and-white":
      return attempt(g.email, "carousel.library.black_and_white", imageId, async () => {
        const row = await blackAndWhite(image, g.email);
        return { id: row.id, url: row.public_url };
      });
    case "edit": {
      const prompt = str(b.prompt, 1000).trim();
      if (!prompt) return bad("Say what to change");
      return attempt(g.email, "carousel.library.ai_edit", imageId, async () => {
        const { path } = await aiEdit(image, prompt);
        return { path, url: publicUrl(path), prompt };
      }, { prompt });
    }
  }
  return bad("Unknown action", 404);
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;
