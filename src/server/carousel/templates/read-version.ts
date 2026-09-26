import { sbRest } from "@/lib/data/supabase";
import { validateTemplate } from "@/lib/carousel/template/validate";

/** Read a batch's exact pinned version, never the current active version.
 * Inactive historical versions remain readable for retries, but must still pass
 * generation validation. This does not select/activate a template for new work.
 */
export async function readPinnedTemplate(templateId: string, version: number) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId) ||
      !Number.isSafeInteger(version) || version < 1) throw new Error("Invalid template version identity");
  const id = templateId.toLowerCase();
  let result: unknown;
  try {
    // Two rows detect duplicate identities rather than hiding them with limit=1.
    result = await sbRest<unknown>(`carousel_template_versions?template_id=eq.${id}&version=eq.${version}&select=id,template_id,version,template&order=id.asc&limit=2`);
  } catch { throw new Error("Template version could not be read"); }
  if (!Array.isArray(result) || result.length !== 1) throw new Error("Expected exactly one pinned template version");
  const row = result[0];
  if (!row || typeof row !== "object" || Array.isArray(row) || row.template_id !== id || row.version !== version || typeof row.id !== "string" || !row.id.trim()) {
    throw new Error("Template version identity mismatch");
  }
  const template = validateTemplate(row.template);
  if (template.version !== version) throw new Error("Template JSON version does not match its pinned version");
  return { versionId: row.id as string, templateId: id, version, template };
}
