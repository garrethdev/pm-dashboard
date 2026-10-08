import { attempt, bad, guard, ok } from "@/server/carousel/http";
import { deleteLibrary, getLibrary } from "@/server/carousel/repo/libraries";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  try {
    const library = await getLibrary(id);
    if (!library) return bad("Library not found", 404);
    return ok({ library });
  } catch (err) {
    console.error("carousel library failed", err);
    return bad("The library could not be loaded", 502);
  }
}

/** Delete a library (2026-10-08). Refused while a type draws from it; the banks cannot go. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  return attempt(g.email, "carousel.library.delete", id, () => deleteLibrary(id));
}

export const dynamic = "force-dynamic";
