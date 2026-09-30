import { LibrariesView } from "@/components/carousel/library-view";
import { listLibraries } from "@/server/carousel/repo/libraries";

/* Image libraries (D8): the grid of libraries, with New library at the end. */
export const dynamic = "force-dynamic";

export default async function LibrariesPage() {
  const libraries = await listLibraries().catch((err: unknown) => {
    console.error("libraries failed", err);
    return null;
  });
  return <LibrariesView initial={libraries} />;
}
