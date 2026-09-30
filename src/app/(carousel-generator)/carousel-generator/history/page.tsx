import { HistoryView } from "@/components/carousel/history-view";
import { listBatches } from "@/server/carousel/repo/batches";
import { listTypeShells } from "@/server/carousel/repo/types-catalog";

/* History (D9): every batch, newest first, with DEV-61's words in the Status column. */
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const loaded = await Promise.all([listBatches(), listTypeShells()]).catch((err: unknown) => {
    console.error("history failed", err);
    return null;
  });
  if (!loaded) return <HistoryView initial={null} types={[]} />;
  const [batches, types] = loaded;
  return <HistoryView initial={batches} types={types.map((t) => ({ id: t.id, name: t.name }))} />;
}
