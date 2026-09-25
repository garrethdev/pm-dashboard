"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CarouselTypeSummary } from "@/lib/carousel/types/catalog";

function TypeCard({ type }: { type: CarouselTypeSummary }) {
  const retired = type.lifecycle === "retired";
  return <article className="rounded-[24px] border border-border bg-card p-5">
    <h2 className="font-semibold text-text-primary">{type.name}</h2>
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
      <span className="rounded-full bg-card-raised px-2.5 py-1">{type.character}</span>
      {type.lifecycle !== "live" && <span className="rounded-full bg-card-raised px-2.5 py-1">{type.lifecycle}</span>}
    </div>
    <details className="my-4 border-y border-border py-3 text-sm text-text-muted">
      <summary className="cursor-pointer">View details</summary>
      <dl className="mt-3 space-y-2 text-xs">
        <div><dt>Registry key</dt><dd className="break-all text-text-primary">{type.id}</dd></div>
        <div><dt>Generator setup</dt><dd>Template, Writing and image library are not connected yet.</dd></div>
      </dl>
    </details>
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-text-muted">{retired ? "Retired" : "Setup unavailable"}</span>
      {!retired && <Link href={`/carousel-generator/generate?type=${encodeURIComponent(type.id)}`}
        className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-bg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">Generate</Link>}
    </div>
  </article>;
}

/** Load failures stay failures: an unavailable database must not look like first run. */
export function TypesView() {
  const [types, setTypes] = useState<CarouselTypeSummary[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/carousel-generator/types", { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in again." : "Carousel types could not be loaded.");
        const data = await response.json();
        if (!Array.isArray(data.types)) throw new Error("Unexpected carousel catalog response.");
        setTypes(data.types);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load types.");
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  const active = types?.filter(type => type.lifecycle !== "retired") ?? [];
  const retired = types?.filter(type => type.lifecycle === "retired") ?? [];
  return <section aria-labelledby="carousel-types-heading">
    <header className="mb-7 flex items-center justify-between gap-4">
      <h1 id="carousel-types-heading" className="text-xl font-semibold">Carousel types</h1>
      <button disabled title="Studio creation is not connected yet" className="rounded-full bg-card-raised px-4 py-2 text-xs text-text-muted disabled:cursor-not-allowed">+ New carousel type</button>
    </header>
    {error ? <div role="alert" className="rounded-[24px] border border-border bg-card p-6">
      <p>{error}</p><button className="mt-4 rounded-full bg-card-raised px-4 py-2 text-sm" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Retry</button>
    </div> : types === null ? <p role="status" className="text-sm text-text-muted">Loading carousel types…</p> : <>
      {active.length === 0 && <div className="rounded-[24px] border border-border bg-card p-8 text-center"><h2 className="font-semibold">No active carousel types</h2><p className="mt-2 text-sm text-text-muted">There are no active carousel entries in the registry.</p></div>}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">{active.map(type => <TypeCard key={type.id} type={type} />)}</div>
      {retired.length > 0 && <details className="mt-7"><summary className="cursor-pointer text-sm text-text-muted">Retired · {retired.length}</summary><div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">{retired.map(type => <TypeCard key={type.id} type={type} />)}</div></details>}
    </>}
  </section>;
}
