import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { getImageRow, getLibraryRow } from "@/server/carousel/repo/libraries";
import { publicUrl } from "@/server/carousel/repo/storage";
import { isShape } from "@/server/carousel/services/higgsfield";
import { generateImage } from "@/server/carousel/services/library-images";

/**
 * Generate images, one picture per request (DEV-30). The page asks for each
 * picture of a run on its own, so one that fails can be retried without the
 * others, the way uploads already work. The result is a pending file the
 * person then keeps or discards through the images route. It never names a
 * set (Garreth, 2026-09-16): what is kept lands in the library.
 *
 * The base can be one of the library's pictures (`baseImageId`), or a file
 * in this library's incoming or pending folder (`basePath`): an uploaded
 * reference, or a generated picture being tried again with a note.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const library = await getLibraryRow(id);
  if (!library) return bad("Library not found", 404);
  if (library.readOnly) return bad("This library is read-only", 409);
  const b = await body(req);
  const prompt = str(b.prompt, 1000).trim();
  if (!prompt) return bad("Say what the picture should show");
  if (!isShape(b.shape)) return bad("Pick a shape: portrait, tall or square");
  const shape = b.shape;
  const baseImageId = str(b.baseImageId, 300) || null;
  const basePath = str(b.basePath, 300) || null;
  let baseUrl: string | null = null;
  let derivedFrom: string | null = null;
  if (baseImageId) {
    const base = await getImageRow(library, baseImageId);
    if (!base?.public_url) return bad("The base image is not in this library", 409);
    baseUrl = base.public_url;
    derivedFrom = base.id;
  } else if (basePath) {
    if (!new RegExp(`^${id}/(incoming|pending)/[0-9a-f-]{36}\\.[a-z]{3,4}$`, "i").test(basePath)) return bad("Unknown base picture", 400);
    baseUrl = publicUrl(basePath);
  }
  return attempt(
    g.email,
    "carousel.library.generate",
    id,
    async () => {
      const { path, requestId } = await generateImage({ libraryId: id, prompt, shape, baseUrl });
      return { path, url: publicUrl(path), prompt, shape, baseImageId: derivedFrom, requestId };
    },
    { prompt, shape, baseImageId: derivedFrom, basePath },
  );
}

export const dynamic = "force-dynamic";
// A picture waits on Higgsfield (up to 150 s) and then on the SynthID
// removal's GPU cold start (about 2 min the first time), so the route takes
// the same 300 s ceiling as the AI edit.
export const maxDuration = 300;
