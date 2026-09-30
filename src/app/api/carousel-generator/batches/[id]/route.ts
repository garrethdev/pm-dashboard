import { bad, guard, ok } from "@/server/carousel/http";
import { getBatch, listBriefsIn } from "@/server/carousel/repo/batches";
import { logError } from "@/server/carousel/log";
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
    const words = batchWords(batch);
    // A waiting batch names the one it is waiting behind.
    const holder = words.stage === "waiting" ? (await listBriefsIn(batch.typeId, ["generating", "rendering"]))[0] : null;
    return ok({ batch, words, waitingFor: holder?.batch_name ?? null });
  } catch (err) {
    logError(`batch ${id} read`, err);
    return bad("The batch could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
