import { Studio } from "@/components/carousel/studio";
import { listLibraries } from "@/server/carousel/repo/libraries";
import { fallback } from "@/server/carousel/log";

/* The Studio (D6, D11, D14): a new carousel type from an idea or from a reference deck. */
export const dynamic = "force-dynamic";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  const libraries = await listLibraries().catch(fallback("studio libraries", []));
  const ref = Number(reference);
  return <Studio libraries={libraries} referenceId={Number.isInteger(ref) && ref > 0 ? ref : null} />;
}
