import { bad, guard, ok } from "@/server/carousel/http";
import { getBatch } from "@/server/carousel/repo/batches";
import { reviveIfNeeded } from "@/server/carousel/services/runner";
import { batchWords } from "@/server/carousel/status-words";

/** The batch page polls this; an Auto batch's page is a viewer, not the driver. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  try {
    const batch = await getBatch(id);
    if (!batch) return bad("Batch not found", 404);
    await reviveIfNeeded(batch);
    return ok({ batch, words: batchWords(batch) });
  } catch (err) {
    console.error("carousel batch read failed", err);
    return bad("The batch could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
