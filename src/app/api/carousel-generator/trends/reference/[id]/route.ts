import { bad, guard, ok } from "@/server/carousel/http";
import { getAnalysis, getReference } from "@/server/carousel/repo/trends";

/** The details window (DEV-42): the post, its analysis and its transcription. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n)) return bad("Bad id");
  try {
    const [reference, analysis] = await Promise.all([getReference(g.email, n), getAnalysis(n)]);
    if (!reference) return bad("Not found", 404);
    return ok({ reference, analysis });
  } catch (err) {
    console.error("carousel reference failed", err);
    return bad("The carousel could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
