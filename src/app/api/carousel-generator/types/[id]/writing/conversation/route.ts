import { bad, body, guard, ok, str } from "@/server/carousel/http";
import { logError } from "@/server/carousel/log";
import { listTemplateRecords } from "@/server/carousel/repo/templates";
import { getTypeBasics } from "@/server/carousel/repo/types-catalog";
import { listWriting } from "@/server/carousel/repo/writing";
import { firstWritingDraft, writingConversation, type Said } from "@/server/carousel/services/conversation";

/**
 * The Writing conversation (DEV-25). It proposes; it never saves. `mode:
 * "first_draft"` is the offer on an empty Writing tab. A failure is answered
 * plainly so the page can show it under the message with Retry.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const b = await body(req);
  const message = str(b.message, 2000).trim();
  const first = b.mode === "first_draft";
  if (!first && !message) return bad("Say what should change");
  const history: Said[] = (Array.isArray(b.history) ? (b.history as unknown[]) : [])
    .filter((m): m is { who: string; text: string } => Boolean(m) && typeof (m as { text?: unknown }).text === "string")
    .slice(-12)
    .map((m) => ({ who: m.who === "me" ? "me" : "ai", text: m.text.slice(0, 2000) }));
  try {
    // Only what the conversation needs: the type's name and its template.
    // The full catalogue read is slow and has nothing more to give here.
    const [basics, templates] = await Promise.all([getTypeBasics(), listTemplateRecords()]);
    const type = basics.get(id) ?? [...basics.values()].find((t) => templates.some((r) => r.slug === id && (r.contentType === t.id || r.slug === t.id)));
    if (!type) return bad("Unknown carousel type", 404);
    const template = templates.find((r) => r.contentType === type.id || r.slug === type.id)?.template ?? null;
    const base = { typeName: type.name, character: type.character, template };
    if (first) return ok(await firstWritingDraft(base));
    const active = (await listWriting(type.id)).find((w) => w.active)?.body ?? null;
    return ok(await writingConversation({ ...base, active, draft: str(b.draft, 20_000), history, message }));
  } catch (err) {
    logError(`writing conversation for ${id}`, err);
    return bad(err instanceof Error ? err.message : "The writer could not be reached", 502);
  }
}

export const dynamic = "force-dynamic";
