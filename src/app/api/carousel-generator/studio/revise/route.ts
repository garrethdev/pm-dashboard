import { bad, body, guard, ok, str } from "@/server/carousel/http";
import { logError } from "@/server/carousel/log";
import { getLibrary } from "@/server/carousel/repo/libraries";
import { studioConversation, type Said } from "@/server/carousel/services/conversation";
import { applySlides } from "@/server/carousel/services/studio";

/**
 * The Studio's conversation. It answers with the template as it would have
 * it, which the canvas takes as one undoable step. Nothing is saved here.
 */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const message = str(b.message, 2000).trim();
  const template = b.template as Record<string, unknown> | undefined;
  if (!message) return bad("Say what should change");
  if (!template || !Array.isArray(template.slides)) return bad("A template is required");
  const copy = Object.fromEntries(Object.entries((b.copy ?? {}) as Record<string, unknown>).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v).slice(0, 300)]));
  const history: Said[] = (Array.isArray(b.history) ? (b.history as unknown[]) : [])
    .filter((m): m is { who: string; text: string } => Boolean(m) && typeof (m as { text?: unknown }).text === "string")
    .slice(-12)
    .map((m) => ({ who: m.who === "me" ? "me" : "ai", text: m.text.slice(0, 2000) }));
  try {
    const libraryId = str(b.libraryId, 64);
    const library = libraryId ? await getLibrary(libraryId) : null;
    const sets = (library?.sets ?? []).filter((s) => !s.parentId).map((s) => s.name);
    const change = await studioConversation({ name: str(template.name, 80) || "New carousel type", template, copy, sets, history, message });
    if (!change.slides && !change.direction) return ok({ reply: change.reply, template: null, copy: null });
    const slides = change.slides ?? null;
    const next = slides ? applySlides(template, slides, change.direction) : { ...template, directions: { ...(template.directions as object), copy: change.direction } };
    // Sample lines: what the conversation wrote, else what was already on the canvas.
    const roles = new Set(((next.slides as { text?: { role: string }[] }[]) ?? []).flatMap((s) => (s.text ?? []).map((t) => t.role)));
    const nextCopy: Record<string, string> = {};
    for (const role of roles) nextCopy[role] = change.sample?.[role] ?? copy[role] ?? "";
    if (copy.caption) nextCopy.caption = copy.caption;
    return ok({ reply: change.reply, template: next, copy: nextCopy });
  } catch (err) {
    logError("studio conversation", err);
    return bad(err instanceof Error ? err.message : "The writer could not be reached", 502);
  }
}

export const dynamic = "force-dynamic";
