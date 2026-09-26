import { logError } from "@/server/carousel/log";
import { attempt, bad, body, guard, ok, str } from "@/server/carousel/http";
import { getCarouselType } from "@/server/carousel/repo/catalog";
import { listWriting, makeWritingActive, saveWriting } from "@/server/carousel/repo/writing";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  try {
    return ok({ versions: await listWriting(id) });
  } catch (err) {
    logError("writing list", err);
    return bad("Writing could not be loaded", 502);
  }
}

/** Save version: N+1, made active in the same pass. The bot never saves. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const type = await getCarouselType(id);
  if (!type) return bad("Unknown carousel type", 404);
  const b = await body(req);
  const text = str(b.body, 20_000).trim();
  if (!text) return bad("Nothing to save");
  const rules = Array.isArray(b.citedRuleKeys) ? (b.citedRuleKeys as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 50) : [];
  return attempt(g.email, "carousel.writing.save", type.id, () => saveWriting(type.id, text, g.email, rules), { chars: text.length });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const b = await body(req);
  const versionId = str(b.versionId, 64);
  if (!versionId) return bad("versionId is required");
  return attempt(g.email, "carousel.writing.activate", id, () => makeWritingActive(id, versionId), { versionId });
}

export const dynamic = "force-dynamic";
