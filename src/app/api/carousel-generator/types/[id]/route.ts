import { bad, guard, ok } from "@/server/carousel/http";
import { listBatches } from "@/server/carousel/repo/batches";
import { getCarouselType } from "@/server/carousel/repo/catalog";
import { laneRows } from "@/server/carousel/repo/lane-rows";
import { getTemplateRecord } from "@/server/carousel/repo/templates";
import { listWriting } from "@/server/carousel/repo/writing";

/** The type page (D7): the type, its template versions, its Writing versions, its batches and its lane rows. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const page = Number(new URL(req.url).searchParams.get("rowsPage") ?? 0) || 0;
  try {
    const type = await getCarouselType(id);
    if (!type) return bad("Unknown carousel type", 404);
    const [template, writing, batches, rows] = await Promise.all([
      type.templateId ? getTemplateRecord(type.templateId) : null,
      listWriting(type.id),
      listBatches({ typeId: type.id }),
      type.laneTable ? laneRows(type.laneTable, page) : { rows: [], total: 0, ready: 0 },
    ]);
    return ok({ type, template, writing, batches, rows });
  } catch (err) {
    console.error("carousel type read failed", err);
    return bad("The carousel type could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
