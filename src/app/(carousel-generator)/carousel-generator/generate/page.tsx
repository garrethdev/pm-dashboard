import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerateForm } from "@/components/carousel/generate-form";
import { getCarouselType } from "@/server/carousel/repo/catalog";
import { listLibraries } from "@/server/carousel/repo/libraries";
import { getTemplateRecord } from "@/server/carousel/repo/templates";
import type { CopyRole } from "@/server/carousel/services/writer";

/* Generate (D2): the form for one batch of one type. */
export const dynamic = "force-dynamic";

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ type?: string | string[] }> }) {
  const { type: id } = await searchParams;
  if (typeof id !== "string" || !id) notFound();
  const loaded = await (async () => {
    const type = await getCarouselType(id);
    if (!type) return { missing: true as const };
    const [libraries, template] = await Promise.all([listLibraries(), type.templateId ? getTemplateRecord(type.templateId) : null]);
    const contract = ((template?.template?.copy_contract as CopyRole[] | undefined) ?? []).filter((r) => r.writer === "per_batch");
    return { type, libraries, contract };
  })().catch((err: unknown) => {
    console.error("generate page failed", err);
    return null;
  });
  if (loaded && "missing" in loaded) notFound();
  if (!loaded) {
    return (
      <section role="alert" className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Unable to load this carousel type</h1>
        <p className="text-sm text-text-muted">The registry is unavailable. Go back and try again.</p>
        <Link href="/carousel-generator/types" className="text-accent">Carousel types</Link>
      </section>
    );
  }
  return <GenerateForm type={loaded.type} libraries={loaded.libraries} perBatchRoles={loaded.contract} />;
}
