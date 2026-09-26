import { validateTemplate } from "@/lib/carousel/template/validate";
import { attempt, bad, body, guard, ok, str } from "@/server/carousel/http";
import { createTemplate, listTemplateRecords, slugTaken } from "@/server/carousel/repo/templates";
import { forgetTypeBasics } from "@/server/carousel/repo/types-catalog";

export async function GET() {
  const g = await guard();
  if (g.denied) return g.denied;
  try {
    return ok({ templates: await listTemplateRecords() });
  } catch (err) {
    console.error("carousel templates failed", err);
    return bad("Templates could not be loaded", 502);
  }
}

/**
 * Save as carousel type (DEV-24): name, character, short name; "Taken" when
 * the short name is used by the registry or another template. Saves
 * version 1 and the type appears on Carousel types as Not wired.
 */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const name = str(b.name, 80).trim();
  const character = str(b.character, 40).trim();
  const slug = str(b.slug, 60).trim().toLowerCase();
  if (!name || !character) return bad("Name and character are required");
  if (!/^[a-z0-9][a-z0-9_-]{1,59}$/.test(slug)) return bad("The short name needs letters, numbers, dashes or underscores only");
  if (await slugTaken(slug)) return bad("Taken", 409, "TAKEN");
  const libraryId = str(b.libraryId, 64) || null;
  const template = b.template;
  try {
    validateTemplate({ ...(template as Record<string, unknown>), slug, version: 1 }, "historical");
  } catch (err) {
    return bad(`The template is not valid: ${err instanceof Error ? err.message : "unknown"}`, 422);
  }
  return attempt(g.email, "carousel.template.create", slug, async () => {
    const rec = await createTemplate({
      slug,
      name,
      character,
      libraryId,
      template: { ...(template as Record<string, unknown>), slug, version: 1, name, character },
      sourceReferenceId: typeof b.sourceReferenceId === "number" ? b.sourceReferenceId : null,
      status: "active",
      by: g.email,
    });
    forgetTypeBasics();
    return { id: rec.id, slug: rec.slug };
  });
}

export const dynamic = "force-dynamic";
