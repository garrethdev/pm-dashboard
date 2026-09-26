import { notFound } from "next/navigation";
import { TypePage } from "@/components/carousel/type-page";
import { listBatches } from "@/server/carousel/repo/batches";
import { getCarouselType } from "@/server/carousel/repo/catalog";
import { laneRows } from "@/server/carousel/repo/lane-rows";
import { listLibraries } from "@/server/carousel/repo/libraries";
import { getTemplateRecord } from "@/server/carousel/repo/templates";
import { listWriting } from "@/server/carousel/repo/writing";

/* The type page (D7, D13, D15): Overview, Writing, Rows and Go Live tabs. */
export const dynamic = "force-dynamic";

export default async function CarouselTypePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { slug } = await params;
  const { tab } = await searchParams;
  let type;
  try {
    type = await getCarouselType(slug);
  } catch (err) {
    console.error("type page failed", err);
    return <TypePage slug={slug} initial={null} tab={tab} />;
  }
  if (!type) notFound();
  const [template, writing, batches, rows, libraries] = await Promise.all([
    type.templateId ? getTemplateRecord(type.templateId) : null,
    listWriting(type.id),
    listBatches({ typeId: type.id }),
    type.laneTable ? laneRows(type.laneTable, 0).catch(() => ({ rows: [], total: 0, ready: 0 })) : { rows: [], total: 0, ready: 0 },
    listLibraries().catch(() => []),
  ]);
  return <TypePage slug={slug} tab={tab} initial={{ type, template, writing, batches, rows }} libraries={libraries} />;
}
