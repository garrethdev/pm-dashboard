import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { createSet, getLibrary } from "@/server/carousel/repo/libraries";

/** New set: a folder at the level you are on, nesting one deep. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const library = await getLibrary(id);
  if (!library) return bad("Library not found", 404);
  if (library.readOnly) return bad("This library is read-only", 409);
  const b = await body(req);
  const name = str(b.name, 80).trim();
  if (!name) return bad("A name is required");
  const parentId = str(b.parentId, 64) || null;
  if (parentId && library.sets.find((s) => s.id === parentId)?.parentId) return bad("Sets nest one level deep", 409);
  return attempt(g.email, "carousel.library.set", id, () => createSet(id, name, parentId), { name, parentId });
}

export const dynamic = "force-dynamic";
