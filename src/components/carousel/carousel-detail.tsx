"use client";

import { useEffect, useRef, useState } from "react";
import { CatalogImage } from "./catalog-image";
import { initialSlide, mediaUrl, metric, plainText, safeWebUrl, type CarouselDetail } from "@/lib/carousel/trends/presentation";

/** Native modal supplies focus trapping/Escape; closing preserves the search grid. */
export function CarouselDetailDialog({ id, matchedSlide, onClose }: { id: string; matchedSlide: unknown; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<CarouselDetail | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [slide, setSlide] = useState(0);
  const [tab, setTab] = useState<"Details" | "Analysis" | "Transcription">("Details");
  useEffect(() => {
    const previous = document.activeElement;
    const node = dialog.current;
    node?.showModal();
    return () => { node?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/carousel-generator/carousels/${encodeURIComponent(id)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to view this carousel." : response.status === 404 ? "This carousel is no longer available." : "Carousel details could not be loaded.");
        const data: CarouselDetail = await response.json();
        if (!Array.isArray(data.slides) || !Array.isArray(data.documents) || !data.reference) throw new Error("Unexpected detail response.");
        setDetail(data); setSlide(initialSlide(data.slides, matchedSlide));
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load details."); }
    })();
    return () => controller.abort();
  }, [id, matchedSlide, attempt]);
  const current = detail?.slides[slide];
  const source = safeWebUrl(detail?.reference.source_url);
  const handle = plainText(detail?.reference.creator_handle) || "Unknown creator";
  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="carousel-detail-title" className="fixed inset-0 m-auto max-h-[94dvh] w-[min(1040px,96vw)] max-w-none overflow-auto rounded-[24px] border border-border bg-card p-0 text-text-primary backdrop:bg-black/70">
    <div className="flex justify-end p-3"><button autoFocus type="button" aria-label="Close carousel details" onClick={onClose} className="rounded-full border border-border px-3 py-1">×</button></div>
    <h2 id="carousel-detail-title" className="sr-only">Carousel details: {handle}</h2>
    {error ? <div role="alert" className="p-6"><p>{error}</p><button type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }} className="mt-3 rounded-full border border-border px-4 py-2">Retry</button></div> : !detail ? <p role="status" className="p-6">Loading carousel…</p> : <div className="grid md:grid-cols-[1.2fr_1fr]">
      <div className="relative border-border bg-card-sunken md:border-r">
        <div className="aspect-[4/5] max-h-[70dvh]"><CatalogImage src={detail.slides.length ? mediaUrl(current?.media) : safeWebUrl(detail.reference.thumbnail_url)} alt={`Slide ${slide + 1} by ${handle}`} /></div>
        <div className="flex items-center justify-between p-3">
          <button type="button" disabled={slide === 0} aria-label="Previous slide" onClick={() => setSlide(value => value - 1)} className="size-11 rounded-full border border-border disabled:opacity-30">‹</button>
          <span aria-live="polite" className="tnum text-xs text-text-muted">{detail.slides.length ? `${slide + 1} / ${detail.slides.length}` : "No saved slides"}</span>
          <button type="button" disabled={slide >= detail.slides.length - 1} aria-label="Next slide" onClick={() => setSlide(value => value + 1)} className="size-11 rounded-full border border-border disabled:opacity-30">›</button>
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        <header className="px-5 pb-4"><h3 className="font-semibold">{handle}</h3><p className="mt-1 text-xs text-text-muted">{plainText(detail.reference.platform)}{typeof matchedSlide === "number" ? ` · Matches on slide ${matchedSlide}` : ""}</p></header>
        <div role="tablist" aria-label="Carousel information" className="flex gap-5 border-b border-border px-5">
          {(["Details", "Analysis", "Transcription"] as const).map((name, index, names) => <button key={name} id={`tab-${name}`} type="button" role="tab" tabIndex={tab === name ? 0 : -1} aria-selected={tab === name} aria-controls="detail-panel" onClick={() => setTab(name)} onKeyDown={event => {
            const target = event.key === "ArrowRight" ? (index + 1) % names.length : event.key === "ArrowLeft" ? (index + names.length - 1) % names.length : event.key === "Home" ? 0 : event.key === "End" ? names.length - 1 : -1;
            if (target >= 0) { event.preventDefault(); setTab(names[target]); document.getElementById(`tab-${names[target]}`)?.focus(); }
          }} className={`border-b-2 py-3 text-sm ${tab === name ? "border-text-primary" : "border-transparent text-text-muted"}`}>{name}</button>)}
        </div>
        <div role="tabpanel" tabIndex={0} id="detail-panel" aria-labelledby={`tab-${tab}`} className="min-h-56 flex-1 space-y-4 overflow-auto p-5 text-sm">
          {tab === "Details" && <>
            <div className="grid grid-cols-3 gap-2">{["views", "likes", "saves"].map(key => <div key={key} className="rounded-2xl bg-card-raised p-3"><p className="text-xs capitalize text-text-muted">{key}</p><p className="tnum mt-2">{metric(detail.reference[key]) ?? "Unknown"}</p></div>)}</div>
            <dl className="space-y-3"><div className="flex justify-between gap-3"><dt>Posted</dt><dd>{plainText(detail.reference.published_at) || "Unknown"}</dd></div><div className="flex justify-between"><dt>Saved slides</dt><dd className="tnum">{detail.slides.length}</dd></div></dl>
          </>}
          {tab === "Analysis" && <>
            {detail.reading_required && <p className="text-text-muted">No saved analysis yet.</p>}
            {detail.analysis && <dl className="space-y-3">{Object.entries(detail.analysis).filter(([key, value]) => ["topic", "hook_family"].includes(key) && typeof value === "string").map(([key, value]) => <div key={key}><dt className="text-xs capitalize text-text-muted">{key.replaceAll("_", " ")}</dt><dd className="mt-1 whitespace-pre-wrap">{plainText(value)}</dd></div>)}</dl>}
            {detail.documents.length > 0 && <h4 className="font-medium">Saved evidence</h4>}
            {detail.documents.map((document, index) => <section key={String(document.id ?? index)} className="border-t border-border pt-3"><h4 className="text-xs text-text-muted">{plainText(document.kind)}</h4><p className="mt-2 whitespace-pre-wrap">{plainText(document.content)}</p></section>)}
            <p className="text-xs text-text-muted">Saved model observations are not proof of causation.</p>
          </>}
          {tab === "Transcription" && (detail.slides.length ? detail.slides.map((item, index) => <section key={String(item.id ?? index)}><h4 className="text-xs text-text-muted">Slide {String(item.position ?? index + 1)}</h4><p className="mt-2 whitespace-pre-wrap">{plainText(item.visible_copy) || "No saved transcription for this slide."}</p></section>) : <p className="text-text-muted">No saved transcription.</p>)}
        </div>
        <footer className="flex justify-end border-t border-border p-4">{source && <a href={source} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-4 py-2 text-xs">View Post ↗</a>}</footer>
      </div>
    </div>}
  </dialog>;
}
