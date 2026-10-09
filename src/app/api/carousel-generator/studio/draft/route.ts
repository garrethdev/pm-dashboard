import { bad, body, guard, ok, str } from "@/server/carousel/http";
import { getLibrary } from "@/server/carousel/repo/libraries";
import { fallback } from "@/server/carousel/log";
import { blankTemplate, draftFromIdea, draftFromReference, scratchSpec, templateFromSpec, type StudioSize } from "@/server/carousel/services/studio";

/** From an idea or from a reference (DEV-23): a whole template for the canvas. */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  // No library is allowed: the draft leaves every slide's set empty and the
  // library is picked on the canvas before saving (Garreth, 2026-09-29).
  const libraryId = str(b.libraryId, 64);
  const library = libraryId ? await getLibrary(libraryId).catch(fallback(`draft library ${libraryId}`, null)) : null;
  if (libraryId && !library) return bad("Library not found", 404);
  const size: StudioSize = b.size === "9:16" ? "9:16" : "4:5";
  const sets = library?.sets.filter((s) => !s.parentId && s.count > 0).map((s) => s.name) ?? [];
  const idea = str(b.idea, 2000).trim();
  const referenceId = Number(b.referenceId);
  try {
    // Start from scratch: a plain deck, no model call.
    if (b.scratch === true) {
      const spec = scratchSpec(Number(b.slides) || 5);
      const base = blankTemplate("draft", spec.name, str(b.character, 40) || "Character 3", size);
      return ok({ template: templateFromSpec(base, spec), sample: spec.sample });
    }
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
