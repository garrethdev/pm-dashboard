import { bad, guard, ok } from "@/server/carousel/http";
import { getLibrary } from "@/server/carousel/repo/libraries";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  try {
    const library = await getLibrary(id);
    if (!library) return bad("Library not found", 404);
    return ok({ library });
  } catch (err) {
    console.error("carousel library failed", err);
    return bad("The library could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
