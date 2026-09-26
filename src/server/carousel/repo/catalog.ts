/**
 * The joined catalogue: every carousel type with its batches folded in, and
 * the Overview's numbers. This is what the D1, D7 and D16 screens read.
 */
import { listBatches } from "@/server/carousel/repo/batches";
import { listTypeShells } from "@/server/carousel/repo/types-catalog";
import { savedFeed, trending } from "@/server/carousel/repo/trends";
import type { BatchSummary, CarouselType, OverviewData } from "@/server/carousel/repo/types";
import { batchWords } from "@/server/carousel/status-words";
import { fallback } from "@/server/carousel/log";

/** Fold the batches into the type shells: the last, the running and the waiting batch of each. */
function joinTypes(shells: Awaited<ReturnType<typeof listTypeShells>>, batches: BatchSummary[]): CarouselType[] {
  return shells.map((s) => {
    const mine = batches.filter((b) => b.typeId === s.id);
    const running = mine.find((b) => batchWords(b).running) ?? null;
    const waiting = mine.find((b) => { const w = batchWords(b); return w.needsPerson && !w.running; }) ?? null;
    return {
      ...s,
      lastBatch: mine[0] ?? null,
      runningBatch: running,
      waitingBatch: waiting,
      lastAuto: mine[0]?.madeInAuto ?? false,
    };
  });
}

export async function listCarouselTypes(): Promise<CarouselType[]> {
  const [shells, batches] = await Promise.all([listTypeShells(), listBatches()]);
  return joinTypes(shells, batches);
}

export async function getCarouselType(id: string): Promise<CarouselType | null> {
  const types = await listCarouselTypes();
  return types.find((t) => t.id === id || t.slug === id) ?? null;
}

function isToday(iso: string | null): boolean {
  return Boolean(iso) && iso!.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export async function overviewData(viewer: string): Promise<OverviewData> {
  const [shells, batches, trend, saved] = await Promise.all([
    listTypeShells(),
    listBatches(),
    trending(viewer, 4).catch(fallback("overview trending", { asOf: null, isToday: false, items: [] })),
    savedFeed(viewer, 6).catch(fallback("overview saved", [])),
  ]);
  const types = joinTypes(shells, batches);
  const words = batches.map((b) => ({ b, w: batchWords(b) }));
  const tasks: BatchSummary[] = [
    ...words.filter((x) => x.w.running && x.w.stage !== "stopped").map((x) => x.b),
    ...words.filter((x) => x.w.needsPerson).map((x) => x.b),
  ];
  const today = {
    written: 0,
    rendered: 0,
    approved: 0,
    needsInput: words.filter((x) => x.w.needsPerson).length,
  };
  // What today did: decks written in batches made today, rendered where the
  // render was asked for today, approved where the sign-off was today.
  for (const b of batches) {
    if (isToday(b.createdAt)) today.written += b.counts.written;
    if (isToday(b.renderRequestedAt)) today.rendered += b.counts.rendered;
    if (isToday(b.approvedAt)) today.approved += b.counts.approved;
  }
  const generated = types.filter((t) => t.lastBatch).sort((a, b) => (b.lastBatch!.createdAt).localeCompare(a.lastBatch!.createdAt));
  return {
    today,
    tasks,
    types: generated.slice(0, 5),
    totalTypes: types.filter((t) => t.lifecycle !== "retired").length,
    trending: trend,
    saved,
    firstRun: batches.length === 0 && saved.length === 0,
  };
}
