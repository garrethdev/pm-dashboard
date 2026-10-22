import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { createSet, getLibraryRow, getSetRow, linkedSetFolder } from "@/server/carousel/repo/libraries";

/** New set: a folder at the level you are on, nesting one deep. In a linked library it is a real folder. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const library = await getLibraryRow(id);
  if (!library) return bad("Library not found", 404);
  if (library.readOnly) return bad("This library is read-only", 409);
  const b = await body(req);
  const name = str(b.name, 80).trim();
  if (!name) return bad("A name is required");
  const parentId = str(b.parentId, 200) || null;
  if (parentId) {
    if (library.linked) {
      try {
        if (linkedSetFolder(library, parentId).includes("/")) return bad("Sets nest one level deep", 409);
      } catch {
        return bad("That set is not in this library", 409);
      }
    } else {
      const parent = await getSetRow(parentId);
      if (!parent || parent.library_id !== id) return bad("That set is not in this library", 409);
      if (parent.parent_id) return bad("Sets nest one level deep", 409);
    }
  }
  return attempt(g.email, "carousel.library.set", id, () => createSet(library, name, parentId), { name, parentId });
}

export const dynamic = "force-dynamic";
