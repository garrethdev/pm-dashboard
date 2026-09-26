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
  // One slow read must not take the page down: anything that fails leaves
  // the client to load it with a Retry (Supabase's REST layer times out on
  // its own schedule, seen 2026-09-25).
  const loaded = await (async () => {
    const type = await getCarouselType(slug);
    if (!type) return { missing: true as const };
    const [template, writing, batches, rows, libraries] = await Promise.all([
      type.templateId ? getTemplateRecord(type.templateId).catch(() => null) : null,
      listWriting(type.id).catch(() => []),
      listBatches({ typeId: type.id }).catch(() => []),
      type.laneTable ? laneRows(type.laneTable, 0).catch(() => ({ rows: [], total: 0, ready: 0 })) : { rows: [], total: 0, ready: 0 },
      listLibraries().catch(() => []),
    ]);
    return { type, template, writing, batches, rows, libraries };
  })().catch((err: unknown) => {
    console.error("type page failed", err);
    return null;
  });
  if (loaded && "missing" in loaded) notFound();
  if (!loaded) return <TypePage slug={slug} initial={null} tab={tab} />;
  const { libraries, ...initial } = loaded;
  return <TypePage slug={slug} tab={tab} initial={initial} libraries={libraries} />;
}
