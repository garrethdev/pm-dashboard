import { attempt, bad, body, guard, ok, str } from "@/server/carousel/http";
import { createBatch, listBatches } from "@/server/carousel/repo/batches";
import { getCarouselType } from "@/server/carousel/repo/catalog";
import { getTemplateRecord } from "@/server/carousel/repo/templates";
import { ensureLoop } from "@/server/carousel/services/runner";

export async function GET(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const url = new URL(req.url);
  const typeId = url.searchParams.get("type") ?? undefined;
  try {
    return ok({ batches: await listBatches({ typeId }) });
  } catch (err) {
    console.error("carousel batches list failed", err);
    return bad("Batches could not be loaded", 502);
  }
}

/**
 * Generate (F1): one batch for one type. The type's active template, active
 * Writing and library are pinned onto the batch, so a later change to any
 * of them leaves a running batch on what it started with.
 */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const typeId = str(b.typeId, 200);
  const requested = Number(b.requested);
  if (!typeId) return bad("typeId is required");
  if (!Number.isInteger(requested) || requested < 1 || requested > 50) return bad("requested must be a whole number from 1 to 50");
  const type = await getCarouselType(typeId);
  if (!type) return bad("Unknown carousel type", 404);
  if (type.lifecycle === "retired") return bad("This type is retired", 409);
  if (!type.writing) return bad("This type needs writing before it can generate", 409, "NEEDS_WRITING");
  if (!type.templateId) return bad("This type has no template", 409, "NO_TEMPLATE");
  const libraryId = str(b.libraryId, 64) || type.libraryId;
  if (!libraryId) return bad("Choose an image library", 409, "NO_LIBRARY");
  if (type.runningBatch) return bad("A batch is already running for this type", 409, "RUNNING");
  const template = await getTemplateRecord(type.templateId);
  const perBatchText: Record<string, string> = {};
  const raw = (b.perBatchText ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(raw)) if (/^[a-zA-Z0-9_-]{1,100}$/.test(k) && typeof v === "string") perBatchText[k] = v.slice(0, 10_000);

  return attempt(g.email, "carousel.batch.create", typeId, async () => {
    const batch = await createBatch(
      { typeId, requested, auto: b.auto === true, note: str(b.note, 2000), perBatchText, libraryId, createdBy: g.email, rerunOf: str(b.rerunOf, 64) || null },
      { templateId: type.templateId, templateVersion: template?.activeVersion ?? null, writingVersionId: type.writing!.id, title: type.name },
    );
    ensureLoop(batch.id);
    return { id: batch.id, batchName: batch.batchName };
  });
}

export const dynamic = "force-dynamic";
