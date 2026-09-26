"use client";

/**
 * One deck's card, in every state the flows name: a skeleton while it
 * waits or writes, the copy once written, a danger pill and the reason
 * when flagged, Retry when failed, the painted slides when rendered,
 * Approved after the sign-off, dimmed with its reason when Auto dropped it.
 * Regenerate opens a feedback box on the card; Discard is a hold in the
 * More menu; a track that was not found offers Retry music lookup and
 * Change track.
 */
import { useEffect, useState } from "react";
import { Btn, Pill, SlideFace, useJson } from "@/components/carousel/kit";
import { HoldButton } from "@/components/ui/hold-button";
import { AlertTriangle, DotsThree, Loader2, MusicNote, RotateCw, Search } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Batch, Deck } from "@/server/carousel/repo/types";

const SK = [78, 58, 66, 42, 72, 52];

function Skeleton({ deck }: { deck: Deck }) {
  const failed = deck.state === "failed";
  return (
    <>
      <div className="flex flex-col gap-3">
        {deck.feedback && <p className="rounded-[12px] bg-card-sunken px-3 py-2 text-xs text-text-muted italic">“{deck.feedback}”</p>}
        {failed ? (
          <div role="alert" className="rounded-[12px] border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{deck.lastError ?? "Writing timed out"}</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <i className="block h-4 w-[82%] animate-pulse rounded bg-card-raised" />
            <i className="block h-4 w-[54%] animate-pulse rounded bg-card-raised" />
          </div>
        )}
        <ol className="flex flex-col gap-1.5" aria-hidden>
          {SK.map((w, i) => (
            <li key={i} className="flex items-center gap-2"><span className="w-4 text-[11px] text-text-muted tnum">{i + 2}</span><i className="block h-3 animate-pulse rounded bg-card-raised" style={{ width: `${w}%` }} /></li>
          ))}
        </ol>
        <div className="flex flex-col gap-1.5" aria-hidden><i className="block h-3 w-[92%] animate-pulse rounded bg-card-raised" /><i className="block h-3 w-[38%] animate-pulse rounded bg-card-raised" /></div>
      </div>
    </>
  );
}

function CopyList({ deck, batch }: { deck: Deck; batch: Batch }) {
  const hidden = new Set(["caption", "hook_type", "peptide_angle", "datestamp"]);
  const order = batch.roles.length ? batch.roles : Object.keys(deck.copy);
  const roles = [...order.filter((k) => k in deck.copy), ...Object.keys(deck.copy).filter((k) => !order.includes(k))]
    .filter((k) => !hidden.has(k))
    .map((k) => [k, deck.copy[k]] as const);
  const hookKey = roles.find(([k]) => deck.hook && deck.copy[k] === deck.hook)?.[0];
  const lines = roles.filter(([k]) => k !== hookKey);
  return (
    <div tabIndex={0} role="region" aria-label={`Deck ${deck.position} copy`} className="flex flex-col gap-2 outline-none">
      <p className="text-[15px] leading-[22px] font-semibold tracking-[-0.01em]">{deck.hook}</p>
      <ol className="flex flex-col gap-1">
        {lines.map(([k, v], i) => (
          <li key={k} className="flex gap-2 text-[13px] leading-[18px] text-text-muted">
            <span className="w-4 shrink-0 text-[11px] leading-[18px] tnum">{i + 2}</span>
            <span className="min-w-0 break-words" title={k}>{v}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TrackPicker({ onPick, onCancel }: { onPick: (t: string) => void; onCancel: () => void }) {
  const [q, setQ] = useState("");
  const { data } = useJson<{ tracks: string[] }>(`/api/carousel-generator/music?q=${encodeURIComponent(q)}`);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card-raised px-3 py-1.5">
        <Search className="size-3.5 text-text-muted" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tracks" aria-label="Search tracks" className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted" />
      </div>
      <div role="listbox" aria-label="Tracks" className="flex max-h-40 flex-col overflow-y-auto rounded-nested border border-border glass-overlay p-1">
        {(data?.tracks ?? []).map((t) => (
          <button key={t} type="button" role="option" aria-selected={false} onClick={() => onPick(t)} className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-sm hover:bg-card"><MusicNote className="size-3.5 text-text-muted" />{t}</button>
        ))}
        {data && data.tracks.length === 0 && <span className="px-2 py-1.5 text-xs text-text-muted">No tracks match</span>}
      </div>
      <button type="button" onClick={onCancel} className="w-fit text-xs text-text-muted hover:text-text-primary">Cancel</button>
    </div>
  );
}

export function DeckCard({ deck, batch, layout, onAction }: { deck: Deck; batch: Batch; layout: "grid" | "rows"; onAction: (deckId: string, action: string, body?: unknown) => Promise<void> }) {
  const [fb, setFb] = useState(false);
  const [note, setNote] = useState("");
  const [menu, setMenu] = useState(false);
  const [track, setTrack] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu]);

  const s = deck.state;
  const skeleton = s === "pending" || s === "writing" || s === "failed";
  const flagged = s === "flagged";
  const dropped = s === "dropped";
  const rendered = s === "rendered" || s === "approved";
  const rendering = s === "render_queued" || s === "rendering";
  const autoTries = batch.madeInAuto && deck.tries > 1 && (s === "writing" || s === "flagged" || s === "pending");
  const musicBad = deck.musicStatus === "not_found";
  const canRegen = s === "written" || flagged || rendered || dropped;
  const label = `Deck ${deck.position}`;

  const submitFeedback = () => {
    setFb(false);
    void onAction(deck.id, "regenerate", { feedback: note });
    setNote("");
  };

  return (
    <article
      id={`deck-${deck.position}`}
      tabIndex={0}
      aria-label={label}
      aria-busy={s === "writing" || rendering}
      className={cn(
        "relative flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card outline-none focus-visible:border-accent",
        dropped && "opacity-60",
        flagged && "border-danger/40",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-muted tnum">{label}</span>
        {deck.version > 1 && <Pill className="tnum">v{deck.version}</Pill>}
        <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {s === "writing" && <Pill tone="accent">{deck.version > 1 || deck.tries > 1 ? "Rewriting" : "Writing"}</Pill>}
          {s === "pending" && <Pill>Up next</Pill>}
          {s === "written" && <Pill>Written</Pill>}
          {s === "render_queued" && <Pill>Queued</Pill>}
          {s === "rendering" && <Pill tone="accent">Rendering</Pill>}
          {s === "rendered" && <Pill>Rendered</Pill>}
          {s === "approved" && <Pill tone="ok">Approved</Pill>}
          {s === "failed" && <Pill tone="danger">Failed</Pill>}
          {flagged && <Pill tone="danger">{deck.flagReason ?? "Flagged"}</Pill>}
          {dropped && <><Pill>Dropped</Pill>{deck.flagReason && <Pill className="opacity-70">{deck.flagReason}</Pill>}</>}
          {autoTries && <Pill className="tnum">Try {deck.tries} of 3</Pill>}
          {(s === "written" || flagged || rendered) && (
            <span className="relative">
              <button type="button" aria-label={`More for ${label}`} aria-haspopup="menu" aria-expanded={menu} onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }} className="flex size-7 items-center justify-center rounded-full text-text-muted hover:bg-card-raised hover:text-text-primary">
                <DotsThree className="size-4" />
              </button>
              {menu && (
                <div role="menu" className="absolute top-full right-0 z-20 mt-1 min-w-40 rounded-nested border border-border glass-overlay p-1.5" onClick={(e) => e.stopPropagation()}>
                  <HoldButton onConfirm={() => { setMenu(false); void onAction(deck.id, "discard"); }} className="w-full justify-start">Discard deck</HoldButton>
                </div>
              )}
            </span>
          )}
        </span>
      </div>

      {skeleton && <Skeleton deck={deck} />}

      {!skeleton && (
        <>
          {(rendered || rendering) && (
            <div className={cn("grid gap-1.5", layout === "rows" ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-3")}>
              {(deck.slides.length ? deck.slides : Array.from({ length: batch.slides ?? 6 }, (_, i) => ({ position: i + 1, renderedSvg: null }))).map((sl) => (
                <SlideFace key={sl.position} svg={"renderedSvg" in sl ? sl.renderedSvg : null} label={`Slide ${sl.position}`} className={cn("aspect-[4/5] rounded-[10px] border border-border", rendering && !("renderedSvg" in sl && sl.renderedSvg) && "animate-pulse")} />
              ))}
            </div>
          )}
          {rendered && (
            <button type="button" onClick={() => setShowCopy((c) => !c)} className="w-fit text-xs text-text-muted hover:text-text-primary">{showCopy ? "Hide copy" : "Show copy"}</button>
          )}
          {(!rendered || showCopy) && !rendering && <CopyList deck={deck} batch={batch} />}
          {deck.caption && !rendering && <p className="line-clamp-3 text-xs text-text-muted">{deck.caption}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {track ? (
              <TrackPicker onPick={(t) => { setTrack(false); void onAction(deck.id, "track", { track: t }); }} onCancel={() => setTrack(false)} />
            ) : (
              <>
                <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs", musicBad ? "text-warn" : "text-text-muted")} title={deck.music ?? ""}>
                  {musicBad ? <AlertTriangle className="size-3.5 shrink-0" /> : <MusicNote className="size-3.5 shrink-0" />}
                  <span className="truncate">{deck.music || (musicBad ? "Track not found" : "No track")}</span>
                </span>
                {musicBad && !dropped && (
                  <span className="ml-auto flex items-center gap-1">
                    <Btn line onClick={() => onAction(deck.id, "track", { track: deck.music ?? "" })} disabled={!deck.music}><RotateCw className="size-3.5" />Retry music lookup</Btn>
                    <Btn line onClick={() => setTrack(true)}>Change track</Btn>
                  </span>
                )}
                {!musicBad && rendered && s !== "approved" && (
                  <button type="button" onClick={() => setTrack(true)} className="ml-auto text-xs text-text-muted hover:text-text-primary">Change track</button>
                )}
              </>
            )}
          </div>
          {fb && (
            <div className="flex flex-col gap-2">
              <textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shorter hook, warmer tone" aria-label={`Feedback for ${label}`} className="w-full resize-none rounded-[12px] border border-border bg-bg/60 px-3 py-2 text-sm outline-none placeholder:text-text-muted" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitFeedback(); }} />
              <button type="button" onClick={() => setFb(false)} className="w-fit text-xs text-text-muted hover:text-text-primary">Cancel</button>
            </div>
          )}
        </>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {s === "failed" && <Btn line full onClick={() => onAction(deck.id, "retry")}><RotateCw className="size-3.5" />Retry</Btn>}
        {canRegen && s !== "approved" && (
          fb ? (
            <Btn line full onClick={submitFeedback}><RotateCw className="size-3.5" />{note.trim() ? "Regenerate with feedback" : "Regenerate"}</Btn>
          ) : (
            <Btn line full onClick={() => setFb(true)} title="Regenerate"><RotateCw className="size-3.5" />Regenerate</Btn>
          )
        )}
        {s === "writing" && <Btn line full disabled><Loader2 className="size-3.5 animate-spin" />Writing</Btn>}
      </div>
    </article>
  );
}
