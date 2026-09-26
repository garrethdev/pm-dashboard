import { bad, body, guard, ok, str } from "@/server/carousel/http";
import { getLibrary } from "@/server/carousel/repo/libraries";
import { blankTemplate, draftFromIdea, draftFromReference, templateFromSpec, type StudioSize } from "@/server/carousel/services/studio";

/** From an idea or from a reference (DEV-23): a whole template for the canvas. */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const libraryId = str(b.libraryId, 64);
  if (!libraryId) return bad("Choose an image library first");
  const library = await getLibrary(libraryId).catch(() => null);
  if (!library) return bad("Library not found", 404);
  const size: StudioSize = b.size === "9:16" ? "9:16" : "4:5";
  const sets = library.sets.filter((s) => !s.parentId && s.count > 0).map((s) => s.name);
  const idea = str(b.idea, 2000).trim();
  const referenceId = Number(b.referenceId);
  try {
    if (Number.isInteger(referenceId) && referenceId > 0) {
      const { spec, reference } = await draftFromReference(g.email, referenceId, sets, size);
      const base = blankTemplate("draft", spec.name, str(b.character, 40) || "Character 3", size);
      return ok({ template: { ...templateFromSpec(base, spec), source_reference_id: referenceId }, reference, sample: spec.sample });
    }
    if (!idea) return bad("Say what the carousel is about");
    const spec = await draftFromIdea(idea, sets, size);
    const base = blankTemplate("draft", spec.name, str(b.character, 40) || "Character 3", size);
    return ok({ template: templateFromSpec(base, spec), sample: spec.sample });
  } catch (err) {
    console.error("studio draft failed", err);
    return bad(err instanceof Error ? err.message : "The draft failed", 502);
  }
}

export const dynamic = "force-dynamic";
