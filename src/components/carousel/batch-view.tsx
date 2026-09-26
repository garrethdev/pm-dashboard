"use client";

/**
 * The batch page: D3 while writing, D4 once written (Render (n) decks), D5
 * while rendering and when finished (Approve (n) decks). D12's Auto pill,
 * Pause auto and Resume auto sit on the progress line. The page polls the
 * batch; in Auto it is a viewer, never the driver.
 */
import { useEffect, useMemo, useState } from "react";
import { DeckCard } from "@/components/carousel/deck-card";
import { Accent, Btn, PageHead, Pill, Track, post, typeMeta, useJson } from "@/components/carousel/kit";
import { AlertTriangle, GridFour, Pause, Play, RotateCw, Rows } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Batch } from "@/server/carousel/repo/types";
import type { BatchWords } from "@/server/carousel/status-words";

interface Payload {
  batch: Batch;
  words: BatchWords;
}

export function BatchView({ id, initial }: { id: string; initial: Payload | null }) {
  const { data, error, reload, setData } = useJson<Payload>(`/api/carousel-generator/batches/${id}`, { every: 2500, initial });
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [layout, setLayout] = useState<"grid" | "rows">("grid");
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenNote, setRegenNote] = useState("");
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const d = data ?? initial;
  const decks = useMemo(() => (d ? d.batch.decks.filter((x) => x.state !== "discarded") : []), [d]);

  if (!d) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Batch</h1>
        <p className="text-sm text-text-muted">{error ?? "Loading"}</p>
        <Btn onClick={reload}>Retry</Btn>
      </div>
    );
  }
  const { batch: b, words: w } = d;
  const c = b.counts;
  const auto = b.mode === "auto" && b.lifecycle === "open";
  const paused = b.madeInAuto && b.mode === "manual" && b.lifecycle === "open";
  const stalled = w.stalled;
  const done = w.stage === "to_approve" || (w.stage === "done" && c.rendered > 0 && b.lifecycle === "open");
  const failed = c.failed;

  const act = async (action: string, body?: unknown) => {
    setBusy(action);
    setActionError(null);
    const res = await post<Payload>(`/api/carousel-generator/batches/${id}/${action}`, { revision: b.revision, ...(body as object) });
    if (res.error) setActionError(res.error);
    setBusy(null);
    reload();
  };
  const deckAct = async (deckId: string, action: string, body?: unknown) => {
    setActionError(null);
    // Optimistic: a regenerate shows the deck writing at once.
    if (action === "regenerate" || action === "retry") {
      setData((prev) => prev ? { ...prev, batch: { ...prev.batch, decks: prev.batch.decks.map((x) => (x.id === deckId ? { ...x, state: "writing" } : x)) } } : prev);
    }
    const res = await post(`/api/carousel-generator/decks/${deckId}/${action}`, body);
    if (res.error) setActionError(res.error);
    reload();
  };

  // The count line, in D12's words.
  let countText: string;
  if (w.stage === "writing") countText = `${c.written} of ${b.requested - c.dropped - c.discarded} written`;
  else if (w.stage === "rendering") countText = `${c.rendered} of ${c.written} rendered`;
  else if (b.lifecycle === "finished") countText = `${c.approved} of ${c.rendered} approved`;
  else if (c.rendered > 0) countText = `${c.rendered} of ${c.written} rendered`;
  else countText = `${c.written} of ${b.requested - c.dropped - c.discarded} written`;
  const progress = w.progress ?? (b.lifecycle === "finished" ? 1 : c.written / Math.max(1, b.requested));
  const stalledDeck = stalled ? decks.find((x) => x.state === "writing" || x.state === "rendering") : null;

  const renderBtn = w.stage === "to_render" && (
    <Accent onClick={() => act("render")} busy={busy === "render"}>Render {c.written - c.rendered} decks</Accent>
  );
  const approveBtn = done && c.rendered > 0 && (
    <Accent onClick={() => act("approve")} busy={busy === "approve"}>Approve {c.rendered} decks</Accent>
  );
  const regenAllBtn = (w.stage === "to_render" || done) && (c.flagged + c.dropped > 0) && (
    <span className="relative">
      <Btn line onClick={() => setRegenOpen((o) => !o)}><RotateCw className="size-3.5" />Regenerate {c.flagged + c.dropped} decks</Btn>
      {regenOpen && (
        <div role="dialog" aria-label="Regenerate flagged decks" className="absolute top-full right-0 z-30 mt-2 flex w-80 flex-col gap-2 rounded-nested border border-border glass-overlay p-3">
          <textarea rows={3} value={regenNote} onChange={(e) => setRegenNote(e.target.value)} placeholder="Every hook under eight words" aria-label="Feedback for the flagged decks" className="w-full resize-none rounded-[12px] border border-border bg-bg/60 px-3 py-2 text-sm outline-none placeholder:text-text-muted" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRegenOpen(false)} className="text-xs text-text-muted hover:text-text-primary">Cancel</button>
            <Btn line onClick={() => { setRegenOpen(false); void act("regenerate-flagged", { feedback: regenNote }); }}><RotateCw className="size-3.5" />Regenerate</Btn>
          </div>
        </div>
      )}
    </span>
  );
  const autoBtn = (auto || paused) && (
    <Btn line onClick={() => act(auto ? "pause-auto" : "resume-auto")} busy={busy === "pause-auto" || busy === "resume-auto"}>
      {auto ? <><Pause className="size-3.5" />Pause auto</> : <><Play className="size-3.5" />Resume auto</>}
    </Btn>
  );
  const stopBtn = b.lifecycle === "open" && (w.stage === "writing" || w.stage === "rendering") && !stalled && (
    <Btn line onClick={() => act("stop")} busy={busy === "stop"}>Stop</Btn>
  );

  return (
    <div className="flex flex-col gap-6 pb-24 sm:pb-0">
      <PageHead
        back={{ href: `/carousel-generator/types/${encodeURIComponent(b.typeId)}`, label: "Carousel types" }}
        title={b.typeName}
        meta={c.rendered > 0 || done ? typeMeta(b) : undefined}
        actions={
          c.rendered > 0 ? (
            <div role="radiogroup" aria-label="Layout" className="inline-flex rounded-full bg-card-raised p-0.5">
              {(["grid", "rows"] as const).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={layout === l} onClick={() => setLayout(l)} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", layout === l ? "bg-accent text-bg" : "text-text-muted hover:text-text-primary")}>
                  {l === "grid" ? <GridFour className="size-3.5" /> : <Rows className="size-3.5" />}
                  {l === "grid" ? "Grid" : "Rows"}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-2">
        <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="font-medium tnum">{countText}</span>
          {auto && <Pill tone="accent">Auto</Pill>}
          {paused && <Pill>Auto paused</Pill>}
          {b.lifecycle === "finished" && <Pill>Done</Pill>}
          {c.flagged > 0 && <a href="#flagged" className="text-xs text-danger tnum">{c.flagged} flagged</a>}
          {c.dropped > 0 && <span className="text-xs text-text-muted tnum">{c.dropped} dropped</span>}
          {failed > 0 && <span className="text-xs text-danger tnum">{failed} failed</span>}
          {stalled && (
            <span className="inline-flex items-center gap-1.5 text-xs text-warn">
              <AlertTriangle className="size-3.5" />
              <span>{stalledDeck ? `Deck ${stalledDeck.position} stalled` : "Stalled"}{now > 0 ? `, last moved ${Math.max(1, Math.floor((now - Date.parse(b.lastMovementAt)) / 1000))}s ago` : ""}</span>
            </span>
          )}
          {w.stage === "stopped" && (
            <>
              <span className="text-xs text-text-muted">{stalled ? "" : "Stopped"}</span>
              <Accent onClick={() => act("continue")} busy={busy === "continue"}>Continue</Accent>
            </>
          )}
          <span className="ml-auto hidden items-center gap-2 sm:flex">
            {autoBtn}
            {stopBtn}
            {regenAllBtn}
            {renderBtn}
            {approveBtn}
          </span>
        </div>
        {b.lifecycle !== "finished" && <Track value={progress} />}
        {actionError && <p role="alert" className="text-xs text-danger">{actionError}</p>}
        {error && <p className="text-xs text-text-muted">{error}</p>}
      </div>

      <div className={cn("grid gap-3", layout === "rows" || c.rendered === 0 ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}>
        {decks.map((deck) => (
          <DeckCard key={deck.id} deck={deck} batch={b} layout={layout} onAction={deckAct} />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-bg/80 px-4 py-3 backdrop-blur-xl sm:hidden">
        {autoBtn}
        {stopBtn}
        {regenAllBtn}
        {renderBtn}
        {approveBtn}
      </div>
    </div>
  );
}
