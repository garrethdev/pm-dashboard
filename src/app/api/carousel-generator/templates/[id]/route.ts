import { logError } from "@/server/carousel/log";
import { validateTemplate } from "@/lib/carousel/template/validate";
import { attempt, bad, body, guard, ok, str } from "@/server/carousel/http";
import { getTemplateRecord, makeTemplateVersionActive, patchTemplate, saveTemplateVersion } from "@/server/carousel/repo/templates";
import { forgetTypeBasics } from "@/server/carousel/repo/types-catalog";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  try {
    const template = await getTemplateRecord(id);
    if (!template) return bad("Template not found", 404);
    return ok({ template });
  } catch (err) {
    logError("template read", err);
    return bad("The template could not be loaded", 502);
  }
}

/** Save version (DEV-24): N+1, active in the same pass. A running batch keeps its version. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const rec = await getTemplateRecord(id);
  if (!rec) return bad("Template not found", 404);
  const b = await body(req);
  const template = b.template as Record<string, unknown> | undefined;
  if (!template) return bad("A template is required");
  const next = (rec.versions[0]?.version ?? 0) + 1;
  try {
    validateTemplate({ ...template, slug: rec.slug, version: next }, "historical");
  } catch (err) {
    return bad(`The template is not valid: ${err instanceof Error ? err.message : "unknown"}`, 422);
  }
  return attempt(g.email, "carousel.template.version", rec.slug, async () => {
    const saved = await saveTemplateVersion(rec.id, { ...template, slug: rec.slug, version: next }, g.email, b.activate !== false);
    forgetTypeBasics();
    return { version: saved.activeVersion, versions: saved.versions };
  });
}

/** Make active (a past version), or rename / repoint the library. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const rec = await getTemplateRecord(id);
  if (!rec) return bad("Template not found", 404);
  const b = await body(req);
  if (typeof b.activateVersion === "number") {
    return attempt(g.email, "carousel.template.activate", rec.slug, async () => {
      await makeTemplateVersionActive(rec.id, b.activateVersion as number);
      forgetTypeBasics();
    }, { version: b.activateVersion });
  }
  const patch: { name?: string; character?: string; libraryId?: string | null; status?: "draft" | "active" | "archived" } = {};
  if (typeof b.name === "string") patch.name = str(b.name, 80);
  if (typeof b.character === "string") patch.character = str(b.character, 40);
  if (b.libraryId === null || typeof b.libraryId === "string") patch.libraryId = b.libraryId === null ? null : str(b.libraryId, 64);
  if (b.status === "archived" || b.status === "draft" || b.status === "active") patch.status = b.status;
  return attempt(g.email, "carousel.template.patch", rec.slug, async () => {
    await patchTemplate(rec.id, patch);
    forgetTypeBasics();
  }, patch);
}

export const dynamic = "force-dynamic";
