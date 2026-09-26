"use client";

/**
 * Image libraries (D8, approved 2026-09-16; DEV-19c read-only, DEV-29's New
 * library and New set). The grid of libraries with a New library tile at the
 * end; inside one, the sets as a rail with the images in a grid, an image
 * modal with its details, and Upload / Generate images / Tag with AI as the
 * pieces that are not connected yet, saying so rather than pretending.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Accent, Btn, LoadError, PageHead, Pill, post, useJson } from "@/components/carousel/kit";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronLeft, Images, Plus, Sparkles, Upload, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Library, LibraryDetail, LibraryImage } from "@/server/carousel/repo/types";

export function LibrariesView({ initial }: { initial: Library[] | null }) {
  const { data, error, reload } = useJson<{ libraries: Library[] }>("/api/carousel-generator/libraries", { initial: initial ? { libraries: initial } : null });
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const libs = data?.libraries ?? initial;
  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await post("/api/carousel-generator/libraries", { name: name.trim() });
    setBusy(false);
    setNaming(false);
    setName("");
    reload();
  };
  if (!libs) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold">Image libraries</h1>
        <LoadError message={error ?? "Libraries could not be loaded"} onRetry={reload} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Image libraries</h1>
        <span className="text-sm text-text-muted tnum">{libs.length} {libs.length === 1 ? "library" : "libraries"}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {libs.map((l) => (
          <Link key={l.id} href={`/carousel-generator/library/${l.id}` as never} className="group flex flex-col gap-2.5 transition-opacity hover:opacity-90">
            {/* The tile is a mosaic of the library's own images: one large, two stacked. */}
            <span className="grid aspect-[4/5] w-full grid-cols-[2fr_1fr] grid-rows-2 gap-1 overflow-hidden rounded-nested bg-card-sunken">
              {[0, 1, 2].map((i) => (
                <span key={i} className={cn("bg-card-raised bg-cover bg-center", i === 0 && "row-span-2")} style={l.covers[i] ? { backgroundImage: `url("${l.covers[i]}")` } : undefined}>
                  {i === 0 && !l.covers[0] && <span className="flex h-full items-center justify-center text-text-muted"><Images className="size-6" /></span>}
                </span>
              ))}
            </span>
            <span className="flex flex-col px-0.5">
              <span className="truncate text-sm font-semibold">{l.name}</span>
              <span className="text-xs text-text-muted tnum">{l.count === 0 ? "Nothing in it yet" : `${l.count} images`}{l.untagged ? ` · ${l.untagged} unread` : ""}</span>
            </span>
          </Link>
        ))}
        <button type="button" onClick={() => setNaming(true)} className="flex aspect-[4/5] flex-col items-center justify-center gap-2 self-start rounded-nested border border-dashed border-border bg-card-sunken p-4 text-sm text-text-muted hover:text-text-primary">
          <Plus className="size-4" />
          New library
        </button>
      </div>
      {naming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div aria-hidden onClick={() => setNaming(false)} className="absolute inset-0 bg-[var(--scrim)]" />
          <form role="dialog" aria-label="New library" onSubmit={(e) => { e.preventDefault(); void create(); }} className="relative flex w-full max-w-sm flex-col gap-3 rounded-card border border-border bg-card p-5">
            <h2 className="text-base font-semibold">New library</h2>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Library name" maxLength={80} className="w-full rounded-nested border border-border bg-bg/60 px-3.5 py-2 text-sm outline-none placeholder:text-text-muted" />
            <div className="flex justify-end gap-2"><Btn onClick={() => setNaming(false)}>Cancel</Btn><Accent type="submit" disabled={!name.trim()} busy={busy}>Create</Accent></div>
          </form>
        </div>
      )}
    </div>
  );
}

function ImageModal({ img, onClose, readOnly }: { img: LibraryImage; onClose: () => void; readOnly: boolean }) {
  const details = img.details ? Object.entries(img.details).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) : [];
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-[var(--scrim)]" />
      <div role="dialog" aria-modal="true" aria-label="Image" className="relative flex max-h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-card border border-border bg-card p-5 md:flex-row">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-card-raised text-text-muted hover:text-text-primary"><X className="size-[18px]" /></button>
        <span className="block aspect-[4/5] w-full max-w-sm shrink-0 rounded-nested border border-border bg-card-sunken bg-cover bg-center" style={{ backgroundImage: `url("${img.url}")` }} role="img" aria-label={img.setName ?? "Image"} />
        <div className="flex min-w-0 flex-1 flex-col gap-3 pr-10 text-sm">
          <div className="flex flex-wrap gap-1.5">
            {img.setName && <Pill>{img.setName}</Pill>}
            {img.subsetName && <Pill>{img.subsetName}</Pill>}
            {img.isCover && <Pill tone="ok">Cover</Pill>}
            {img.status !== "active" && <Pill>{img.status}</Pill>}
            {!img.details && !readOnly && <Pill tone="warn">Not read</Pill>}
          </div>
          {img.luminance !== null && <span className="text-xs text-text-muted tnum">Luminance {Math.round(img.luminance)}</span>}
          {details.length > 0 ? (
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
              {details.map(([k, v]) => (<div key={k} className="contents"><dt className="text-text-muted capitalize">{k.replace(/_/g, " ")}</dt><dd>{Array.isArray(v) ? v.join(", ") : String(v)}</dd></div>))}
            </dl>
          ) : (
            <p className="text-text-muted">{readOnly ? "The two bank libraries carry their pool and category and nothing more." : "No details yet. Tag with AI reads them."}</p>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            <Btn disabled title="Not connected yet">Background removal</Btn>
            <Btn disabled title="Not connected yet">Black and white</Btn>
            <Btn disabled title="Not connected yet">Read with AI</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LibraryDetailView({ id, initial }: { id: string; initial: LibraryDetail | null }) {
  const { data, error, reload } = useJson<{ library: LibraryDetail }>(`/api/carousel-generator/libraries/${id}`, { initial: initial ? { library: initial } : null });
  const lib = data?.library ?? initial;
  const [set, setSet] = useState<string | null>(null);
  const [open, setOpen] = useState<LibraryImage | null>(null);
  const [newSet, setNewSet] = useState(false);
  const [setName, setSetName] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = useMemo(() => {
    if (!lib) return [];
    if (!set) return lib.images;
    const s = lib.sets.find((x) => x.id === set);
    if (!s) return lib.images;
    const parent = s.parentId ? lib.sets.find((p) => p.id === s.parentId) : null;
    return lib.images.filter((i) => (parent ? i.setName === parent.name && i.subsetName === s.name : i.setName === s.name));
  }, [lib, set]);
  if (!lib) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold">Library</h1>
        <LoadError message={error ?? "The library could not be loaded"} onRetry={reload} />
      </div>
    );
  }
  const tops = lib.sets.filter((s) => !s.parentId);
  const createSet = async () => {
    if (!setName.trim()) return;
    setBusy(true);
    const cur = set ? lib.sets.find((s) => s.id === set) : null;
    await post(`/api/carousel-generator/libraries/${id}/sets`, { name: setName.trim(), parentId: cur && !cur.parentId ? cur.id : null });
    setBusy(false);
    setNewSet(false);
    setSetName("");
    reload();
  };
  return (
    <div className="flex flex-1 flex-col gap-5">
      <PageHead
        back={{ href: "/carousel-generator/library", label: "Image libraries" }}
        title={lib.name}
        meta={<><Pill className="tnum">{lib.count} images</Pill>{lib.readOnly && <Pill>Read-only</Pill>}{lib.untagged > 0 && <Pill tone="warn" className="tnum">{lib.untagged} unread</Pill>}</>}
        actions={
          lib.readOnly ? null : (
            <>
              <Btn disabled title="Uploads are not connected yet"><Upload className="size-3.5" />Upload</Btn>
              <Btn disabled title="Higgsfield is not connected yet"><Sparkles className="size-3.5" />Generate images</Btn>
              <Btn disabled title="Not connected yet">Tag with AI</Btn>
              <Btn onClick={() => setNewSet(true)}><Plus className="size-3" />New set</Btn>
            </>
          )
        }
      />
      <div className="grid flex-1 gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Sets" className="no-scrollbar flex gap-1 overflow-x-auto md:flex-col">
          <button type="button" onClick={() => setSet(null)} className={cn("flex shrink-0 items-center justify-between gap-2 rounded-nested px-3 py-1.5 text-left text-sm", set === null ? "bg-card font-medium" : "text-text-muted hover:text-text-primary")}>All<span className="text-xs tnum">{lib.count}</span></button>
          {tops.map((s) => (
            <div key={s.id} className="flex shrink-0 gap-1 md:flex-col">
              <button type="button" onClick={() => setSet(s.id)} className={cn("flex shrink-0 items-center justify-between gap-2 rounded-nested px-3 py-1.5 text-left text-sm", set === s.id ? "bg-card font-medium" : "text-text-muted hover:text-text-primary")}>{s.name}<span className="text-xs tnum">{s.count}</span></button>
              {lib.sets.filter((c) => c.parentId === s.id).map((c) => (
                <button key={c.id} type="button" onClick={() => setSet(c.id)} className={cn("flex shrink-0 items-center justify-between gap-2 rounded-nested py-1.5 pr-3 pl-6 text-left text-xs", set === c.id ? "bg-card font-medium text-text-primary" : "text-text-muted hover:text-text-primary")}>{c.name}<span className="tnum">{c.count}</span></button>
              ))}
            </div>
          ))}
        </nav>
        <div className="flex flex-1 flex-col">
          {shown.length === 0 ? (
            <div className="flex flex-1 flex-col rounded-card border border-border bg-card p-5"><EmptyState icon={Images}>{lib.images.length === 0 ? "No images yet" : "Nothing in this set"}</EmptyState></div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {shown.map((img) => (
                <button key={img.id} type="button" onClick={() => setOpen(img)} aria-label={`${img.setName ?? "Image"}${img.subsetName ? ` · ${img.subsetName}` : ""}`} className={cn("relative aspect-[4/5] overflow-hidden rounded-[10px] border border-border bg-card-sunken bg-cover bg-center transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]", img.status !== "active" && "opacity-40")} style={{ backgroundImage: `url("${img.url}")` }}>
                  {img.isCover && <span className="absolute top-1.5 left-1.5 rounded-full bg-black/50 px-1.5 text-[10px] leading-4 text-white">Cover</span>}
                  {!img.details && !lib.readOnly && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-warn" aria-hidden />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {open && <ImageModal img={open} onClose={() => setOpen(null)} readOnly={lib.readOnly} />}
      {newSet && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div aria-hidden onClick={() => setNewSet(false)} className="absolute inset-0 bg-[var(--scrim)]" />
          <form role="dialog" aria-label="New set" onSubmit={(e) => { e.preventDefault(); void createSet(); }} className="relative flex w-full max-w-sm flex-col gap-3 rounded-card border border-border bg-card p-5">
            <h2 className="text-base font-semibold">New set{set && !lib.sets.find((s) => s.id === set)?.parentId ? ` in ${lib.sets.find((s) => s.id === set)?.name}` : ""}</h2>
            <input autoFocus value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="Name" aria-label="Set name" maxLength={80} className="w-full rounded-nested border border-border bg-bg/60 px-3.5 py-2 text-sm outline-none placeholder:text-text-muted" />
            <div className="flex justify-end gap-2"><Btn onClick={() => setNewSet(false)}>Cancel</Btn><Accent type="submit" disabled={!setName.trim()} busy={busy}>Create</Accent></div>
          </form>
        </div>
      )}
      <span className="hidden"><ChevronLeft /></span>
    </div>
  );
}
