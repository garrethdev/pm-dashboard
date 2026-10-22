import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { getLibraryRow } from "@/server/carousel/repo/libraries";
import { writeDirections } from "@/server/carousel/services/directions";

/**
 * Different directions (2026-10-22): one instruction becomes several
 * distinct prompts, one per picture, the way Claude writes them when
 * Garreth generates through the Higgsfield connector. The prompts come
 * back for the person to read and change before anything is generated.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const library = await getLibraryRow(id);
  if (!library) return bad("Library not found", 404);
  if (library.readOnly) return bad("This library is read-only", 409);
  const b = await body(req);
  const instruction = str(b.instruction, 1000).trim();
  if (!instruction) return bad("Say what the pictures should show, and how they should differ");
  const count = Math.max(1, Math.min(12, Math.round(Number(b.count)) || 1));
  return attempt(g.email, "carousel.library.directions", id, async () => ({ prompts: await writeDirections(instruction, count, library.name) }), { instruction, count });
}

export const dynamic = "force-dynamic";
