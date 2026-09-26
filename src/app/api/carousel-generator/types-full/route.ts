import { bad, guard, ok } from "@/server/carousel/http";
import { listCarouselTypes } from "@/server/carousel/repo/catalog";

/** The full catalogue with batches folded in (D1). The plain registry list stays at /types. */
export async function GET() {
  const g = await guard();
  if (g.denied) return g.denied;
  try {
    return ok({ types: await listCarouselTypes() });
  } catch (err) {
    console.error("carousel types-full failed", err);
    return bad("Carousel types could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
