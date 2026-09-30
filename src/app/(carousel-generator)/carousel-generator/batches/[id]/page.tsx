import { notFound } from "next/navigation";
import { BatchView } from "@/components/carousel/batch-view";
import { getBatch } from "@/server/carousel/repo/batches";
import { reviveIfNeeded } from "@/server/carousel/services/runner";
import { batchWords } from "@/server/carousel/status-words";

/* The batch page (D3 writing, D4 review, D5 finished), one screen that follows the batch's state. */
export const dynamic = "force-dynamic";

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let batch;
  try {
    batch = await getBatch(id);
  } catch (err) {
    console.error("batch page failed", err);
    return <BatchView id={id} initial={null} />;
  }
  if (!batch) notFound();
  await reviveIfNeeded(batch);
  return <BatchView id={id} initial={{ batch, words: batchWords(batch) }} />;
}
