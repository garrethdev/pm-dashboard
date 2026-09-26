import { TypesView } from "@/components/carousel/types-view";
import { listCarouselTypes } from "@/server/carousel/repo/catalog";

/* Carousel types (D1): one card per type, live first, retired folded away. */
export const dynamic = "force-dynamic";

export default async function CarouselTypesPage() {
  const types = await listCarouselTypes().catch((err: unknown) => {
    console.error("types failed", err);
    return null;
  });
  return <TypesView initial={types} />;
}
