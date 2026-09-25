"use client";

import { useEffect, useRef, useState } from "react";
import { CatalogImage } from "./catalog-image";
import { CarouselDetailDialog } from "./carousel-detail";
import { SEARCH_CHANNELS, mediaUrl, plainText, safeWebUrl, searchSummary, type SearchChannel, type SearchResponse } from "@/lib/carousel/trends/presentation";

/** Submit-driven search, not a substitute for DEV-36/45's ranked unseen feed.
 * A request sequence prevents a slower old search replacing a newer result.
 */
export function TrendsSearch() {
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<SearchChannel>("meaning");
  const [creator, setCreator] = useState("");
  const [topic, setTopic] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<{ creator?: string; topic?: string }>({});
  const [pending, setPending] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<{ id: string; slide: unknown } | null>(null);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const lastSearch = useRef<{ query: string; channel: SearchChannel; filters: { creator?: string; topic?: string } } | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function search(retry = false) {
    const body = retry ? lastSearch.current : { query: query.trim(), channel, filters: { ...(creator.trim() ? { creator: creator.trim() } : {}), ...(topic.trim() ? { topic: topic.trim() } : {}) } };
    if (!body?.query) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const current = ++sequence.current; lastSearch.current = body;
    setPending(body.query); setError(""); setResult(null);
    try {
      const response = await fetch("/api/carousel-generator/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: controller.signal, body: JSON.stringify({ ...body, limit: 25 }),
      });
      if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in again." : response.status === 504 ? "The search timed out." : "The search could not be completed.");
      const data: SearchResponse = await response.json();
      if (!Array.isArray(data.results) || !data.pagination) throw new Error("Unexpected search response.");
      if (sequence.current === current) { setResult(data); setAppliedFilters(body.filters); }
    } catch (cause) {
      if (!controller.signal.aborted && sequence.current === current) setError(cause instanceof Error ? cause.message : "Search failed.");
    } finally { if (sequence.current === current) setPending(""); }
  }
  function clear() {
    request.current?.abort(); sequence.current++;
    setQuery(""); setCreator(""); setTopic(""); setAppliedFilters({}); setPending(""); setError(""); setResult(null); lastSearch.current = null;
  }
  function removeFilter(key: "creator" | "topic") {
    if (key === "creator") setCreator(""); else setTopic("");
    if (lastSearch.current) {
      const filters = { ...lastSearch.current.filters }; delete filters[key];
      lastSearch.current = { ...lastSearch.current, filters };
      void search(true);
    }
  }
  const filterCount = Number(Boolean(creator.trim())) + Number(Boolean(topic.trim()));
  return <section aria-labelledby="trends-heading" className="mx-auto flex w-full max-w-5xl flex-col gap-5">
    <header className="flex flex-wrap items-center justify-between gap-4"><h1 id="trends-heading" className="text-xl font-semibold">Trends</h1><span className="text-xs text-text-muted">Carousel search</span></header>
    <form onSubmit={event => { event.preventDefault(); void search(); }} className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center rounded-full border border-border bg-card px-4">
        <label htmlFor="carousel-search" className="sr-only">Search carousels</label>
        <input id="carousel-search" value={query} onChange={event => setQuery(event.target.value)} maxLength={1000} placeholder="Search carousels…" className="min-w-0 flex-1 bg-transparent py-3 text-sm" />
        {query && <button type="button" onClick={clear} aria-label="Clear search" className="px-2 text-text-muted">×</button>}
        <button type="submit" disabled={!query.trim()} aria-label="Search" className="rounded-full px-2 py-2 text-sm disabled:opacity-30">⌕</button>
      </div>
      <label className="sr-only" htmlFor="search-channel">Search type</label>
      <select id="search-channel" value={channel} onChange={event => setChannel(event.target.value as SearchChannel)} className="max-w-full rounded-full border border-border bg-card px-3 py-3 text-xs">{SEARCH_CHANNELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button type="button" aria-expanded={filterOpen} aria-controls="search-filters" onClick={() => setFilterOpen(value => !value)} className="rounded-full border border-border px-4 py-3 text-xs">Filters{filterCount ? ` (${filterCount})` : ""}</button>
    </form>
    {filterOpen && <form id="search-filters" onSubmit={event => { event.preventDefault(); void search(); }} className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
      <label className="text-xs text-text-muted">Creator<input value={creator} onChange={event => setCreator(event.target.value)} maxLength={200} placeholder="Creator handle" className="mt-2 block w-full rounded-xl border border-border bg-transparent p-3 text-sm text-text-primary" /></label>
      <label className="text-xs text-text-muted">Topic<input value={topic} onChange={event => setTopic(event.target.value)} maxLength={200} placeholder="Topic" className="mt-2 block w-full rounded-xl border border-border bg-transparent p-3 text-sm text-text-primary" /></label>
      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => { setCreator(""); setTopic(""); }} className="rounded-full border border-border px-4 py-2 text-xs">Clear filters</button><button type="submit" disabled={!query.trim()} className="rounded-full border border-border px-4 py-2 text-xs disabled:opacity-30">Apply</button></div>
    </form>}
    {pending && <div role="status"><p className="mb-4 text-sm text-text-muted">Searching for “{pending}”…</p><div className="grid grid-cols-3 gap-1 sm:gap-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[4/5] rounded-xl bg-card-raised motion-safe:animate-pulse" />)}</div></div>}
    {error && <div role="alert" className="rounded-2xl border border-border p-5"><p>{error}</p><button type="button" onClick={() => void search(true)} className="mt-3 rounded-full border border-border px-4 py-2 text-sm">Retry</button></div>}
    {!pending && !error && !result && <p className="py-12 text-center text-sm text-text-muted">Search the saved carousel library. The ranked feed is not connected yet.</p>}
    {result && <>
      <p role="status" className="text-sm text-text-muted">{searchSummary(result)}</p>
      <div className="flex flex-wrap gap-2">{Object.entries(appliedFilters).map(([key, value]) => <button key={key} type="button" aria-label={`Remove ${key} filter ${value}`} onClick={() => removeFilter(key as "creator" | "topic")} className="rounded-full border border-border px-3 py-1 text-xs">{value} ×</button>)}</div>
      {result.fallback && <p className="text-xs text-text-muted">Meaning search was unavailable. Showing keyword matches.</p>}
      <div className="-mx-6 grid grid-cols-3 gap-1 sm:mx-0 sm:gap-3">{result.results.map((item, index) => {
        const id = String(item.reference.id);
        const handle = plainText(item.reference.creator_handle) || "Unknown creator";
        return <button key={`${id}-${index}`} type="button" onClick={() => setSelection({ id, slide: item.matched_slide })} className="group relative overflow-hidden border border-border text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:rounded-xl" aria-label={`Open carousel by ${handle}${typeof item.matched_slide === "number" ? `, matched slide ${item.matched_slide}` : ""}`}>
          <div className="aspect-[4/5] bg-card"><CatalogImage src={mediaUrl(item.matched_media) ?? safeWebUrl(item.thumbnail_url)} alt={`Carousel by ${handle}`} /></div>
          <span className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1"><span className="sr-only">{handle}</span><span className="tnum rounded-full bg-card/90 px-2 py-1 text-[10px] text-text-primary">{item.slide_count} saved slides</span></span>
        </button>;
      })}</div>
    </>}
    {selection && <CarouselDetailDialog key={selection.id} id={selection.id} matchedSlide={selection.slide} onClose={() => setSelection(null)} />}
  </section>;
}
