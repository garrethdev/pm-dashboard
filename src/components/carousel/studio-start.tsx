"use client";

/**
 * The screens before the Studio canvas (D6-Start, D6-Library, D6-Reference,
 * D11-Start). Four ways in: a saved reference deck, an idea discussed with
 * the writer, a plain deck from scratch (Garreth, 2026-10-08), or a Figma
 * link, which is not connected yet. Then the library, which a second click
 * un-ticks (Czedrick's finding of 2026-10-08), and for an idea the prompt.
 */
import { useEffect, useRef, useState } from "react";
import { Accent, Btn, compact, post, shortDate } from "@/components/carousel/kit";
import { uploadPicture } from "@/components/carousel/library-upload";
import { Check, ChevronLeft, LayoutList, Loader2, Pencil, Play, Plus, Sparkles, SquaresFour } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Library, Reference } from "@/server/carousel/repo/types";
import type { StudioSize } from "@/components/carousel/studio-model";

export type Way = "reference" | "idea" | "scratch";

export function Head({ name, onBack, back = "Back" }: { name: string; onBack: () => void; back?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"><ChevronLeft className="size-3.5" />{back}</button>
      <h1 className="text-xl font-semibold tracking-[-0.02em]">{name}</h1>
    </div>
  );
}

export function StartScreen({ name, onBack, onPick }: { name: string; onBack: () => void; onPick: (way: Way) => void }) {
  const card = "flex min-h-56 flex-col items-center justify-center gap-4 rounded-card border border-border bg-card p-6 text-center hover:border-text-muted/40";
  return (
    <div className="flex flex-1 flex-col gap-5">
      <Head name={name} onBack={onBack} back="Carousel types" />
      <div className="flex flex-1 items-center justify-center">
        <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => onPick("reference")} className={card}><span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><LayoutList className="size-5" /></span><span className="flex flex-col gap-1"><b className="text-sm">Start from a reference deck</b><span className="text-xs text-text-muted">A deck you saved on Trends, redrawn as a type.</span></span></button>
          <button type="button" onClick={() => onPick("idea")} className={card}><span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><Sparkles className="size-5" /></span><span className="flex flex-col gap-1"><b className="text-sm">Discuss your idea</b><span className="text-xs text-text-muted">Describe it and the writer drafts the slides.</span></span></button>
          <button type="button" onClick={() => onPick("scratch")} className={card}><span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><SquaresFour className="size-5" /></span><span className="flex flex-col gap-1"><b className="text-sm">Start from scratch</b><span className="text-xs text-text-muted">Five plain slides to build by hand. No AI.</span></span></button>
          <button type="button" disabled title="Figma import is not connected yet" className={cn(card, "opacity-50")}><span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><Pencil className="size-5" /></span><span className="flex flex-col gap-1"><b className="text-sm">Start from a Figma link</b><span className="text-xs text-text-muted">Not connected yet.</span></span></button>
        </div>
      </div>
    </div>
  );
}

/** Saved reference decks, one picked to start from (D6-Reference). */
export function ReferenceGrid({ name, onBack, onPick }: { name: string; onBack: () => void; onPick: (id: number) => void }) {
  const [state, setState] = useState<{ items: Reference[] | null; error: string | null }>({ items: null, error: null });
  useEffect(() => {
    let live = true;
    fetch("/api/carousel-generator/trends/saved", { cache: "no-store" })
      .then(async (r) => { const j = (await r.json().catch(() => null)) as { items?: Reference[]; error?: string } | null; if (!live) return; if (!r.ok || !j?.items) setState({ items: null, error: j?.error ?? "Saved decks could not be loaded" }); else setState({ items: j.items, error: null }); })
      .catch(() => { if (live) setState({ items: null, error: "Saved decks could not be loaded" }); });
    return () => { live = false; };
  }, []);
  return (
    <div className="flex flex-1 flex-col gap-5">
      <Head name={name} onBack={onBack} />
      <div className="flex flex-1 items-start justify-center">
        <div className="w-full max-w-4xl rounded-card border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3"><b className="text-sm">Saved reference decks</b><span className="text-xs text-text-muted tnum">{state.items ? `${state.items.length} saved` : ""}</span></div>
          <div className="p-5">
            {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : !state.items ? <p className="flex items-center gap-2 text-sm text-text-muted"><Loader2 className="size-4 animate-spin" />Loading</p> : state.items.length === 0 ? (
              <p className="text-sm text-text-muted">Nothing saved yet. Open Trends, press Save on a deck you like, then come back here.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {state.items.map((r) => {
                  const img = r.slides[0]?.media ?? r.thumbnail;
                  return (
                    <button key={r.id} type="button" onClick={() => onPick(r.id)} className="flex flex-col gap-2 text-left" aria-label={`${r.hook ?? r.handle ?? "Deck"}, ${r.slides.length} slides`}>
                      <span className="block aspect-[4/5] w-full rounded-xl border border-border bg-card-sunken bg-cover bg-center transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]" style={img ? { backgroundImage: `url("${img}")` } : undefined} />
                      <span className="truncate text-xs text-text-primary">{r.hook ?? (r.handle ? `@${r.handle}` : "Deck")}</span>
                      <span className="text-[11px] text-text-muted tnum">{r.slides.length} slides · {compact(r.views) ?? "0"} · {shortDate(r.publishedAt ?? r.createdAt)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LibraryStep({ name, libraries, libraryId, size, onSize, onBack, onPick, onMade, onContinue, onSkip, continueLabel = "Continue" }: {
  name: string;
  libraries: Library[];
  libraryId: string | null;
  size: StudioSize;
  onSize: (s: StudioSize) => void;
  onBack: () => void;
  onPick: (id: string | null) => void;
  onMade: (lib: Library) => void;
  onContinue: () => void;
  onSkip: () => void;
  continueLabel?: string;
}) {
  const [newLib, setNewLib] = useState<{ name: string; busy: boolean; error: string | null } | null>(null);
  const [adding, setAdding] = useState<{ done: number; failed: number; left: number } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const library = libraries.find((l) => l.id === libraryId) ?? null;

  const createLibrary = async () => {
    if (!newLib?.name.trim()) return;
    setNewLib({ ...newLib, busy: true, error: null });
    const res = await post<Library>("/api/carousel-generator/libraries", { name: newLib.name.trim() });
    if (res.error || !res.data) { setNewLib({ ...newLib, busy: false, error: res.error ?? "The library could not be made" }); return; }
    onMade(res.data);
    onPick(res.data.id);
    setNewLib(null);
  };
  const addPictures = async (files: FileList | null) => {
    if (!files || !library) return;
    const list = [...files].slice(0, 40);
    let done = 0;
    let failed = 0;
    setAdding({ done, failed, left: list.length });
    let cur = library;
    for (const file of list) {
      const res = await uploadPicture(library.id, file);
      if (res.error) failed++;
      else done++;
      setAdding({ done, failed, left: list.length - done - failed });
      if (res.image) {
        cur = { ...cur, count: cur.count + 1, cover: cur.cover ?? res.image.url, covers: cur.covers.length < 3 ? [...cur.covers, res.image.url] : cur.covers };
        onMade(cur);
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Head name={name} onBack={onBack} />
      <div className="flex flex-1 items-start justify-center">
        <div role="listbox" aria-label="Image library" className="flex w-full max-w-md flex-col gap-1 rounded-card border border-border bg-card p-3">
          <div className="flex items-center justify-between px-2 py-1 text-sm font-medium"><span>Image library</span>
            <div role="radiogroup" aria-label="Slide size" className="inline-flex rounded-full bg-card-raised p-0.5">{(["4:5", "9:16"] as const).map((s) => <button key={s} type="button" role="radio" aria-checked={size === s} onClick={() => onSize(s)} className={cn("rounded-full px-3 py-1 text-xs font-medium tnum", size === s ? "bg-accent text-bg" : "text-text-muted")}>{s}</button>)}</div>
          </div>
          <p className="px-2 pb-1 text-xs text-text-muted">Click a library to choose it; click it again to leave it unchosen.</p>
          {libraries.map((l) => (
            <button key={l.id} type="button" role="option" aria-selected={libraryId === l.id} onClick={() => onPick(libraryId === l.id ? null : l.id)} className={cn("flex items-center gap-3 rounded-nested px-2 py-2 text-left text-sm hover:bg-card-raised", libraryId === l.id && "bg-card-raised")}>
              <span className="size-9 shrink-0 rounded-[8px] border border-border bg-card-sunken bg-cover bg-center" style={l.cover ? { backgroundImage: `url("${l.cover}")` } : undefined} aria-hidden />
              <span className="flex min-w-0 flex-col"><span className="truncate">{l.name}</span><span className="text-xs text-text-muted tnum">{l.count} images{l.sets.length ? ` · ${l.sets.filter((s) => !s.parentId).length} sets` : ""}</span></span>
              <span className="ml-auto">{libraryId === l.id && <Check className="size-4 text-accent" />}</span>
            </button>
          ))}
          {newLib ? (
            <form onSubmit={(e) => { e.preventDefault(); void createLibrary(); }} className="flex flex-col gap-2 rounded-nested border border-border p-2">
              <input autoFocus value={newLib.name} onChange={(e) => setNewLib({ ...newLib, name: e.target.value, error: null })} placeholder="Name of the new library" aria-label="Library name" maxLength={80} className="w-full rounded-[10px] border border-border bg-bg/60 px-3 py-1.5 text-sm outline-none placeholder:text-text-muted" />
              {newLib.error && <p role="alert" className="text-xs text-danger">{newLib.error}</p>}
              <div className="flex justify-end gap-2"><Btn onClick={() => setNewLib(null)}>Cancel</Btn><Btn type="submit" disabled={!newLib.name.trim()} busy={newLib.busy}>Create</Btn></div>
            </form>
          ) : (
            <button type="button" onClick={() => setNewLib({ name: "", busy: false, error: null })} className="flex items-center gap-3 rounded-nested border border-dashed border-border px-2 py-2 text-left text-sm text-text-muted hover:text-text-primary">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-card-sunken"><Plus className="size-4" /></span>
              New library
            </button>
          )}
          {library && !library.readOnly && (
            <div className="flex flex-wrap items-center gap-2 px-2 pt-1 text-xs text-text-muted">
              <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple hidden onChange={(e) => { void addPictures(e.target.files); e.target.value = ""; }} />
              <Btn onClick={() => picker.current?.click()} disabled={Boolean(adding?.left)}>Add pictures to {library.name}</Btn>
              {adding ? <span role="status" className="tnum">{adding.left > 0 ? `Adding, ${adding.left} to go` : `${adding.done} added`}{adding.failed > 0 ? `, ${adding.failed} failed` : ""}</span> : library.count === 0 ? <span>It is empty. A preview needs at least one picture.</span> : null}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-2 border-t border-border pt-3">
            <Btn onClick={onSkip}>Skip</Btn>
            <Accent disabled={!libraryId} onClick={onContinue}>{continueLabel}</Accent>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IdeaStep({ name, onBack, value, onChange, onSend }: { name: string; onBack: () => void; value: string; onChange: (v: string) => void; onSend: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <Head name={name} onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Sparkles className="size-4" /></span>
          <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSend(); }} placeholder="Describe the carousel: who it is for, what it shows, how it ends" aria-label="Message" className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted" />
          <button type="button" onClick={onSend} disabled={!value.trim()} aria-label="Send" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-text-primary text-bg disabled:opacity-30"><Play className="size-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
