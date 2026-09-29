import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { getLibraryRow } from "@/server/carousel/repo/libraries";
import { signUpload } from "@/server/carousel/repo/storage";
import { EXT, uploadPath } from "@/server/carousel/services/library-images";

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Upload, step one (DEV-29): a one-time link for one file. The browser puts
 * the file straight into the bucket with it, then tells the images route it
 * has arrived. A photograph is larger than a server route may receive.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const library = await getLibraryRow(id);
  if (!library) return bad("Library not found", 404);
  if (library.readOnly) return bad("This library is read-only", 409);
  const b = await body(req);
  const type = str(b.type, 40).toLowerCase();
  const size = Number(b.size);
  if (!EXT[type]) return bad("Only JPEG, PNG, WebP and HEIC pictures can be uploaded", 415);
  if (!Number.isFinite(size) || size <= 0) return bad("The file is empty");
  if (size > MAX_BYTES) return bad("The file is over 20 MB", 413);
  return attempt(g.email, "carousel.library.upload_link", id, async () => {
    const path = uploadPath(id, type);
    return { path, url: await signUpload(path) };
  }, { type, size });
}

export const dynamic = "force-dynamic";
