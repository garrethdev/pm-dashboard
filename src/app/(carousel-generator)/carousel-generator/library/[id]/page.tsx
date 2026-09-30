import { notFound } from "next/navigation";
import { LibraryDetailView } from "@/components/carousel/library-view";
import { getLibrary } from "@/server/carousel/repo/libraries";

/* One library (D8): its sets down the side, its images in a grid, the image modal. */
export const dynamic = "force-dynamic";

export default async function LibraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const library = await getLibrary(id).catch((err: unknown) => {
    console.error("library failed", err);
    return undefined;
  });
  if (library === null) notFound();
  return <LibraryDetailView id={id} initial={library ?? null} />;
}
