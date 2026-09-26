import { bad, guard, ok } from "@/server/carousel/http";
import { listBatches } from "@/server/carousel/repo/batches";
import { batchWords } from "@/server/carousel/status-words";

export async function GET() {
  const g = await guard();
  if (g.denied) return g.denied;
  try {
    const batches = await listBatches();
    return ok({ batches: batches.map((b) => ({ ...b, words: batchWords(b) })) });
  } catch (err) {
    console.error("carousel history failed", err);
    return bad("History could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
