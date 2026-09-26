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
  const [expanded, setExpanded] = useState(false);
  function selectTab(name: typeof tab) {
    setTab(name);
    if (name !== "Details") setExpanded(true);
  }
  useEffect(() => {
    const previous = document.activeElement;
    const node = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node?.showModal();
    return () => { document.body.style.overflow = overflow; node?.close(); if (previous instanceof HTMLElement) previous.focus(); };
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
  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="carousel-detail-title" className="fixed inset-0 m-0 h-dvh max-h-dvh w-screen max-w-none overflow-hidden border-0 bg-card p-0 text-text-primary backdrop:bg-black/70 md:m-auto md:h-auto md:max-h-[94dvh] md:w-[min(1040px,96vw)] md:overflow-auto md:rounded-[24px] md:border md:border-border">
    <div className="flex h-14 items-center justify-between border-b border-border px-4 md:justify-end md:border-0 md:p-3">
      <div className="min-w-0 pr-3 md:hidden"><p className="truncate text-sm font-semibold">{handle}</p><p className="truncate text-xs text-text-muted">{plainText(detail?.reference.platform)}{typeof matchedSlide === "number" ? ` · Matches on slide ${matchedSlide}` : ""}</p></div>
      <button autoFocus type="button" aria-label="Close carousel details" onClick={onClose} className="size-11 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2">×</button>
    </div>
    <h2 id="carousel-detail-title" className="sr-only">Carousel details: {handle}</h2>
    {error ? <div role="alert" className="p-6"><p>{error}</p><button type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }} className="mt-3 rounded-full border border-border px-4 py-2">Retry</button></div> : !detail ? <p role="status" className="p-6">Loading carousel…</p> : <div className="grid md:grid-cols-[1.2fr_1fr]">
      <div role="region" aria-label="Carousel slides" tabIndex={0} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault(); setSlide(value => Math.max(0, Math.min(detail.slides.length - 1, value + (event.key === "ArrowLeft" ? -1 : 1))));
        }
      }} className="relative h-[calc(63dvh-3.5rem)] border-border bg-card-sunken md:h-auto md:border-r">
        <div className="h-full md:aspect-[4/5] md:max-h-[70dvh]"><CatalogImage src={detail.slides.length ? mediaUrl(current?.media) : safeWebUrl(detail.reference.thumbnail_url)} alt={`Slide ${slide + 1} by ${handle}`} /></div>
        <span aria-hidden="true" className="tnum absolute right-3 top-3 rounded-full bg-black/50 px-2 py-1 text-xs text-white md:hidden">{detail.slides.length ? `${slide + 1} / ${detail.slides.length}` : "No saved slides"}</span>
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between p-3 md:static md:translate-y-0">
          <button type="button" disabled={slide === 0} aria-label="Previous slide" onClick={() => setSlide(value => value - 1)} className="size-11 rounded-full border border-border disabled:opacity-30">‹</button>
          <span aria-live="polite" className="sr-only tnum rounded-full bg-card/90 px-2 py-1 text-xs text-text-muted md:not-sr-only">{detail.slides.length ? `${slide + 1} / ${detail.slides.length}` : "No saved slides"}</span>
          <button type="button" disabled={slide >= detail.slides.length - 1} aria-label="Next slide" onClick={() => setSlide(value => value + 1)} className="size-11 rounded-full border border-border disabled:opacity-30">›</button>
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 flex min-h-0 min-w-0 flex-col rounded-t-[24px] bg-card shadow-2xl md:static md:h-auto md:rounded-none md:shadow-none ${expanded ? "h-[85dvh]" : "h-[37dvh]"}`}>
        {/* A real button provides a keyboard alternative to a drag-only sheet. */}
        <button type="button" aria-label={expanded ? "Collapse carousel information" : "Expand carousel information"} aria-expanded={expanded} aria-controls="detail-panel" onClick={() => setExpanded(value => !value)} className="flex h-6 shrink-0 items-center justify-center md:hidden"><span aria-hidden="true" className="h-1 w-9 rounded-full bg-border" /></button>
        <header className="hidden px-5 pb-4 md:block"><h3 className="font-semibold">{handle}</h3><p className="mt-1 text-xs text-text-muted">{plainText(detail.reference.platform)}{typeof matchedSlide === "number" ? ` · Matches on slide ${matchedSlide}` : ""}</p></header>
        <div role="tablist" aria-label="Carousel information" className="flex shrink-0 gap-5 border-b border-border px-5">
          {(["Details", "Analysis", "Transcription"] as const).map((name, index, names) => <button key={name} id={`tab-${name}`} type="button" role="tab" tabIndex={tab === name ? 0 : -1} aria-selected={tab === name} aria-controls="detail-panel" onClick={() => selectTab(name)} onKeyDown={event => {
            const target = event.key === "ArrowRight" ? (index + 1) % names.length : event.key === "ArrowLeft" ? (index + names.length - 1) % names.length : event.key === "Home" ? 0 : event.key === "End" ? names.length - 1 : -1;
            if (target >= 0) { event.preventDefault(); selectTab(names[target]); document.getElementById(`tab-${names[target]}`)?.focus(); }
          }} className={`border-b-2 py-3 text-sm ${tab === name ? "border-text-primary" : "border-transparent text-text-muted"}`}>{name}</button>)}
        </div>
        <div role="tabpanel" tabIndex={0} id="detail-panel" aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 space-y-4 overflow-auto overscroll-contain p-4 text-sm md:min-h-56 md:p-5">
          {tab === "Details" && <>
            <div className="grid grid-cols-3 gap-2">{["views", "likes", "saves"].map(key => <div key={key} className="rounded-2xl bg-card-raised p-3"><p className="text-xs capitalize text-text-muted">{key}</p><p className="tnum mt-2">{metric(detail.reference[key]) ?? "Unknown"}</p></div>)}</div>
            <dl className="space-y-3"><div className="flex justify-between gap-3"><dt>Posted</dt><dd>{plainText(detail.reference.published_at) || "Unknown"}</dd></div><div className="flex justify-between gap-3"><dt>Platform</dt><dd>{plainText(detail.reference.platform) || "Unknown"}</dd></div><div className="flex justify-between"><dt>Saved slides</dt><dd className="tnum">{detail.slides.length}</dd></div></dl>
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
        <footer className="flex shrink-0 justify-end border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{source && <a href={source} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-xs">View Post ↗</a>}</footer>
      </div>
    </div>}
  </dialog>;
}
