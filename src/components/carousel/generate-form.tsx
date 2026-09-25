"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { validDeckCount, type CarouselTypeSummary } from "@/lib/carousel/types/catalog";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-3 border-b border-border px-5 py-5 sm:grid-cols-[180px_1fr] sm:gap-6 sm:px-6"><div className="text-sm">{label}</div><div>{children}</div></div>;
}

/** D2 form shell. Never turn registry posting configuration into generator
 * readiness: those are different contracts. Submission stays disabled until
 * versioned Writing, library bindings and the batch command are connected.
 */
export function GenerateForm({ type }: { type: CarouselTypeSummary }) {
  const [count, setCount] = useState("20");
  const [note, setNote] = useState("");
  const [auto, setAuto] = useState(false);
  const valid = validDeckCount(count);
  const step = (delta: number) => setCount(String(Math.min(50, Math.max(1, (Number(count) || 1) + delta))));
  return <section className="pb-24 sm:pb-0">
    <Link href="/carousel-generator" className="text-sm text-text-muted">‹ Carousel types</Link>
    <header className="mb-7 mt-2 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">{type.name}</h1>
      <span className="rounded-full bg-card-raised px-3 py-1 text-xs text-text-muted">{type.character}</span>
    </header>
    <form onSubmit={event => event.preventDefault()} className="overflow-hidden rounded-[24px] border border-border bg-card">
      <Field label="How many">
        <div className="inline-flex overflow-hidden rounded-full border border-border">
          <button type="button" aria-label="Fewer decks" disabled={valid && Number(count) <= 1} onClick={() => step(-1)} className="px-4 py-2 disabled:opacity-30">−</button>
          <input aria-label="Number of decks" aria-invalid={!valid} aria-describedby={!valid ? "count-error" : undefined} inputMode="numeric" value={count} onChange={event => setCount(event.target.value)} className="w-16 border-x border-border bg-transparent text-center text-sm outline-offset-[-2px]" />
          <button type="button" aria-label="More decks" disabled={valid && Number(count) >= 50} onClick={() => step(1)} className="px-4 py-2 disabled:opacity-30">+</button>
        </div>
        {!valid && <p id="count-error" role="alert" className="mt-2 text-sm text-danger">Enter a whole number from 1 to 50.</p>}
      </Field>
      <Field label="Image library"><p className="text-sm text-text-muted">Library bindings are not connected yet.</p></Field>
      <Field label="Writing"><p className="text-sm text-text-muted">Writing readiness is not available yet.</p></Field>
      <Field label="Note · Optional"><label className="sr-only" htmlFor="batch-note">Batch note</label><textarea id="batch-note" value={note} maxLength={2000} onChange={event => setNote(event.target.value)} placeholder="anything specific about this batch?" rows={2} className="w-full resize-y rounded-2xl border border-border bg-transparent px-4 py-3 text-sm placeholder:text-text-muted" /></Field>
      <Field label="Template"><p className="text-sm text-text-muted">Per-batch fields will appear here when a template is connected.</p></Field>
      <Field label="Auto mode"><button type="button" role="switch" aria-label="Auto mode" aria-checked={auto} onClick={() => setAuto(value => !value)} className={`flex h-6 w-11 items-center rounded-full p-1 ${auto ? "bg-accent" : "bg-card-raised"}`}><span className={`size-4 rounded-full bg-text-primary transition-transform ${auto ? "translate-x-5" : "translate-x-0"}`} /></button><p className="mt-2 text-xs text-text-muted">Advance through writing and rendering automatically. Final approval stays manual.</p></Field>
      <footer className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-border bg-card px-6 py-4 sm:static sm:border-t-0">
        <p id="generation-unavailable" className="text-xs text-text-muted">{type.lifecycle === "retired" ? "This type is retired." : "Batch creation is not connected yet. Nothing will be submitted."}</p>
        <button type="submit" disabled aria-describedby="generation-unavailable" className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-bg opacity-40">Generate</button>
      </footer>
    </form>
  </section>;
}
