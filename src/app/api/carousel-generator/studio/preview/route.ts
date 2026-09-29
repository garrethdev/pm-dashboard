import { bad, body, guard, ok, str } from "@/server/carousel/http";
import { previewTemplate } from "@/server/carousel/services/studio";

/** Render preview (DEV-22): the unsaved template painted by the real painter; nothing uploaded. */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const libraryId = str(b.libraryId, 64);
  const template = b.template as Record<string, unknown> | undefined;
  if (!template || !libraryId) return bad("A template and a library are required");
  const copy: Record<string, string> = {};
  for (const [k, v] of Object.entries((b.copy ?? {}) as Record<string, unknown>)) if (typeof v === "string") copy[k] = v.slice(0, 2000);
  try {
    return ok({ slides: await previewTemplate(template, libraryId, copy) });
  } catch (err) {
    return bad(err instanceof Error ? err.message : "The preview failed", 422);
  }
}

export const dynamic = "force-dynamic";
