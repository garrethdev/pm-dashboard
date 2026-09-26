import { notFound } from "next/navigation";
import { Studio } from "@/components/carousel/studio";
import { listBatches } from "@/server/carousel/repo/batches";
import { listLibraries } from "@/server/carousel/repo/libraries";
import { getTemplateRecord } from "@/server/carousel/repo/templates";
import { listWriting } from "@/server/carousel/repo/writing";
import { fallback } from "@/server/carousel/log";

/* Edit template (DEV-24): the active version opens with the most recent approved deck as sample copy. */
export const dynamic = "force-dynamic";

export default async function StudioEditPage({ params }: { params: Promise<{ template: string }> }) {
  const { template: slug } = await params;
  const rec = await getTemplateRecord(slug).catch(fallback(`studio template ${slug}`, null));
  if (!rec) notFound();
  const typeId = rec.contentType ?? rec.slug;
  const [libraries, writing, batches] = await Promise.all([
    listLibraries().catch(fallback("studio libraries", [])),
    listWriting(typeId).catch(fallback(`studio writing ${typeId}`, [])),
    listBatches({ typeId }).catch(fallback(`studio batches ${typeId}`, [])),
  ]);
  const approved = batches.find((b) => b.counts.approved > 0);
  let sample: Record<string, string> | null = null;
  if (approved) {
    const { getBatch } = await import("@/server/carousel/repo/batches");
    const full = await getBatch(approved.id).catch(fallback(`studio sample batch ${approved.id}`, null));
    const deck = full?.decks.find((d) => d.state === "approved");
    if (deck) sample = { ...deck.copy, caption: deck.caption ?? "" };
  }
  return <Studio libraries={libraries} referenceId={null} editing={rec} writing={writing.find((w) => w.active)?.body ?? null} sample={sample} />;
}
