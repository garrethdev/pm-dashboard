"use client";

/**
 * Image libraries (D8, approved 2026-09-16; DEV-19c read-only, DEV-29 new,
 * upload and retire). The grid of libraries with a New library tile at the
 * end; inside one, the sets as a rail with the images in a grid, Upload
 * with a tile per file, and the image modal with what can be done to one
 * image. Generate images (DEV-30) asks Higgsfield for pictures that wait in
 * a review row for Keep or Discard; Tag with AI is another ticket and says so.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Accent, Btn, LoadError, PageHead, Pill, post, useJson } from "@/components/carousel/kit";
import { EmptyState } from "@/components/ui/empty-state";
import { cutOut, pictureType, putIncoming, uploadPicture } from "@/components/carousel/library-upload";
import { LazyPicture } from "@/components/carousel/lazy-picture";
import { HoldButton } from "@/components/ui/hold-button";
import { ChevronDown, Images, Loader2, Plus, Sparkles, Upload, X } from "@/components/ui/icons";
import { thumbUrl } from "@/lib/carousel/thumb";
import { cn } from "@/lib/utils";
import type { Library, LibraryDetail, LibraryImage } from "@/server/carousel/repo/types";

export function LibrariesView({ initial }: { initial: Library[] | null }) {
  const { data, error, reload } = useJson<{ libraries: Library[] }>("/api/carousel-generator/libraries", { initial: initial ? { libraries: initial } : null });
  const router = useRouter();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState<"upload" | "link">("upload");
  const [folder, setFolder] = useState<{ bucket: string; prefix: string; pictures: number | null }>({ bucket: "", prefix: "", pictures: null });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const libs = data?.libraries ?? initial;
  const create = async () => {
    if (!name.trim() || (source === "link" && !folder.bucket)) return;
    setBusy(true);
    setErr(null);
    const res = await post<Library>("/api/carousel-generator/libraries", source === "link" ? { name: name.trim(), bucket: folder.bucket, prefix: folder.prefix } : { name: name.trim() });
    setBusy(false);
    if (res.error || !res.data) { setErr(res.error ?? "The library could not be made"); return; }
    setNaming(false);
    setName("");
    // Straight into the library: empty with Upload, or the linked folder's pictures.
    router.push(`/carousel-generator/library/${res.data.id}` as never);
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
                <span key={i} className={cn("bg-card-raised bg-cover bg-center", i === 0 && "row-span-2")} style={l.covers[i] ? { backgroundImage: `url("${thumbUrl(l.covers[i], i === 0 ? 480 : 240)}")` } : undefined}>
                  {i === 0 && !l.covers[0] && <span className="flex h-full items-center justify-center text-text-muted"><Images className="size-6" /></span>}
                </span>
              ))}
            </span>
            <span className="flex flex-col px-0.5">
              <span className="truncate text-sm font-semibold">{l.name}</span>
              <span className="text-xs text-text-muted tnum">{l.count === 0 ? "Nothing in it yet" : `${l.count} images`}{l.untagged ? ` · ${l.untagged} unread` : ""}{l.linked ? " · Linked" : ""}</span>
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
          <form role="dialog" aria-label="New library" onSubmit={(e) => { e.preventDefault(); void create(); }} className="relative flex w-full max-w-md flex-col gap-3 rounded-card border border-border bg-card p-5">
            <h2 className="text-base font-semibold">New library</h2>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Library name" maxLength={80} className="w-full rounded-nested border border-border bg-bg/60 px-3.5 py-2 text-sm outline-none placeholder:text-text-muted" />
            <div className="flex flex-col gap-1.5 text-xs text-text-muted">Pictures
              <div role="radiogroup" aria-label="Pictures" className="grid grid-cols-2 rounded-full bg-card-raised p-0.5">
                {([["upload", "Upload here"], ["link", "Link a storage folder"]] as const).map(([v, label]) => <button key={v} type="button" role="radio" aria-checked={source === v} onClick={() => setSource(v)} className={cn("rounded-full px-2 py-1.5 text-xs font-medium", source === v ? "bg-accent text-bg" : "text-text-muted")}>{label}</button>)}
              </div>
            </div>
            {source === "link" && <FolderPicker value={folder} onChange={setFolder} />}
            {source === "link" && <p className="text-xs text-text-muted">A live link: the library always shows what the folder holds, and each subfolder is a set. Pictures are not copied, and the library is read-only here.</p>}
            {err && <p role="alert" className="text-xs text-danger">{err}</p>}
            <div className="flex justify-end gap-2"><Btn onClick={() => setNaming(false)}>Cancel</Btn><Accent type="submit" disabled={!name.trim() || (source === "link" && !folder.bucket)} busy={busy}>{source === "link" ? "Link" : "Create"}</Accent></div>
          </form>
        </div>
      )}
    </div>
  );
}

/** Walks our public buckets one folder at a time; the chosen folder becomes the library. */
function FolderPicker({ value, onChange }: { value: { bucket: string; prefix: string; pictures: number | null }; onChange: (v: { bucket: string; prefix: string; pictures: number | null }) => void }) {
  const [buckets, setBuckets] = useState<string[] | null>(null);
  const [view, setView] = useState<{ key: string; folders: string[]; pictures: number; error: string | null } | null>(null);
  const key = `${value.bucket}/${value.prefix}`;
  useEffect(() => {
    let live = true;
    fetch("/api/carousel-generator/storage", { cache: "no-store" }).then(async (r) => { const j = (await r.json().catch(() => null)) as { buckets?: string[] } | null; if (live) setBuckets(j?.buckets ?? []); }).catch(() => { if (live) setBuckets([]); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!value.bucket) return;
    let live = true;
    fetch(`/api/carousel-generator/storage?bucket=${encodeURIComponent(value.bucket)}&prefix=${encodeURIComponent(value.prefix)}`, { cache: "no-store" })
      .then(async (r) => { const j = (await r.json().catch(() => null)) as { folders?: string[]; pictures?: number; error?: string } | null; if (!live) return; setView({ key, folders: j?.folders ?? [], pictures: j?.pictures ?? 0, error: r.ok ? null : (j?.error ?? "The folder could not be listed") }); })
      .catch(() => { if (live) setView({ key, folders: [], pictures: 0, error: "The folder could not be listed" }); });
    return () => { live = false; };
  }, [value.bucket, value.prefix, key]);
  const cur = view?.key === key ? view : null;
  const crumbs = value.prefix ? value.prefix.split("/") : [];
  const go = (prefix: string) => onChange({ bucket: value.bucket, prefix, pictures: null });
  return (
    <div className="flex flex-col gap-2 rounded-nested border border-border p-2">
      <label className="flex items-center gap-2 text-xs text-text-muted">Bucket
        <span className="relative flex-1">
          <select value={value.bucket} onChange={(e) => onChange({ bucket: e.target.value, prefix: "", pictures: null })} aria-label="Bucket" className="w-full appearance-none rounded-nested border border-border bg-bg/60 py-1.5 pr-7 pl-3 text-xs text-text-primary outline-none">
            <option value="">{buckets ? "Pick a bucket" : "Loading"}</option>
            {buckets?.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2" />
        </span>
      </label>
      {value.bucket && (
        <>
          <nav aria-label="Folder" className="flex flex-wrap items-center gap-1 text-xs">
            <button type="button" onClick={() => go("")} className={cn("rounded-full px-2 py-0.5", crumbs.length ? "text-text-muted hover:text-text-primary" : "bg-card-raised text-text-primary")}>{value.bucket}</button>
            {crumbs.map((c, i) => <span key={i} className="flex items-center gap-1"><span className="text-text-muted">/</span><button type="button" onClick={() => go(crumbs.slice(0, i + 1).join("/"))} className={cn("rounded-full px-2 py-0.5", i === crumbs.length - 1 ? "bg-card-raised text-text-primary" : "text-text-muted hover:text-text-primary")}>{c}</button></span>)}
          </nav>
          {!cur ? <p className="text-xs text-text-muted">Listing</p> : cur.error ? <p role="alert" className="text-xs text-danger">{cur.error}</p> : (
            <>
              {cur.folders.length > 0 && (
                <ul className="max-h-40 overflow-y-auto rounded-nested border border-border" aria-label="Subfolders">
                  {cur.folders.map((f) => <li key={f}><button type="button" onClick={() => go(value.prefix ? `${value.prefix}/${f}` : f)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-card-raised"><Images className="size-3.5 text-text-muted" />{f}</button></li>)}
                </ul>
              )}
              <p className="text-xs text-text-muted tnum">{cur.pictures} {cur.pictures === 1 ? "picture" : "pictures"} directly in this folder{cur.folders.length ? `, ${cur.folders.length} ${cur.folders.length === 1 ? "subfolder" : "subfolders"} as sets` : ""}.</p>
            </>
          )}
        </>
      )}
    </div>
  );
}

const CHECKER = "bg-[length:16px_16px] bg-[linear-gradient(45deg,var(--border)_25%,transparent_25%,transparent_75%,var(--border)_75%),linear-gradient(45deg,var(--border)_25%,transparent_25%,transparent_75%,var(--border)_75%)] bg-[position:0_0,8px_8px]";

/**
 * One image, and what can be done to it (DEV-29). Black and white and
 * background removal are automatic and add a new image beside this one. An
 * AI edit waits for Keep. Retire is a hold, because a deck not yet rendered
 * may still point at the image.
 */
function ImageModal({ img, library, onClose, onChanged }: { img: LibraryImage; library: LibraryDetail; onClose: () => void; onChanged: (note?: string) => void }) {
  const readOnly = library.readOnly;
  const details = img.details ? Object.entries(img.details).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) : [];
  const box = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [edit, setEdit] = useState<{ path: string; url: string; prompt: string } | null>(null);
  const retired = img.status !== "active";
  const base = `/api/carousel-generator/libraries/${library.id}/images`;
  // Escape closes, focus lands inside and goes back to the tile on close,
  // the same as the details window on Trends.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    box.current?.focus();
    return () => { document.removeEventListener("keydown", key); opener?.focus?.(); };
  }, [onClose]);

  const press = async (action: string, body: unknown, note: string) => {
    setBusy(action);
    setErr(null);
    const res = await post(`${base}/${encodeURIComponent(img.id)}/${action}`, body ?? {});
    setBusy(null);
    if (res.error) setErr(res.error);
    else onChanged(note);
  };
  const removeBackground = async () => {
    setBusy("cutout");
    setErr(null);
    try {
      const blob = await cutOut(img.url, setStep);
      setStep("Adding it to the library");
      const res = await uploadPicture(library.id, blob, { setId: img.setId ?? null, madeBy: "background_removal", derivedFrom: img.id });
      if (res.error) setErr(res.error);
      else onChanged("A cut-out was added beside the original.");
    } catch (e) {
      setErr(e instanceof Error ? `Background removal failed: ${e.message}` : "Background removal failed");
    }
    setStep(null);
    setBusy(null);
  };
  const askEdit = async () => {
    if (!prompt.trim()) return;
    setBusy("edit");
    setErr(null);
    const res = await post<{ path: string; url: string; prompt: string }>(`${base}/${encodeURIComponent(img.id)}/edit`, { prompt: prompt.trim() });
    setBusy(null);
    if (res.error || !res.data) setErr(res.error ?? "The edit failed");
    else setEdit(res.data);
  };
  const settleEdit = async (keep: boolean) => {
    if (!edit) return;
    setBusy(keep ? "keep" : "discard");
    setErr(null);
    const res = await post(base, keep ? { path: edit.path, madeBy: "ai_edit", derivedFrom: img.id, prompt: edit.prompt, setId: img.setId ?? null } : { path: edit.path, discard: true });
    setBusy(null);
    if (res.error) { setErr(res.error); return; }
    setEdit(null);
    setPrompt("");
    if (keep) onChanged("The edit was kept and added beside the original.");
  };
  const sets = library.sets.map((s) => ({ id: s.id, label: s.parentId ? `${library.sets.find((p) => p.id === s.parentId)?.name ?? ""} / ${s.name}` : s.name })).sort((a, b) => a.label.localeCompare(b.label));
  const made = img.madeBy === "black_and_white" ? "Black and white copy" : img.madeBy === "background_removal" ? "Cut-out" : img.madeBy === "ai_edit" ? "AI edit" : img.madeBy === "generated" ? "Generated" : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-[var(--scrim)]" />
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Image" className="relative flex max-h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-card border border-border bg-card p-5 outline-none md:flex-row">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-card-raised text-text-muted hover:text-text-primary"><X className="size-[18px]" /></button>
        <div className="flex w-full min-w-0 flex-col gap-2 md:max-w-sm md:shrink-0">
          <span className={cn("block aspect-[4/5] w-full rounded-nested border border-border bg-card-sunken", CHECKER)}>
            <span className="block size-full rounded-nested bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${edit?.url ?? img.url}")` }} role="img" aria-label={edit ? "The edit, not kept yet" : (img.setName ?? "Image")} />
          </span>
          {edit && (
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="warn">Not kept yet</Pill>
              <span className="ml-auto flex gap-2">
                <Btn onClick={() => void settleEdit(false)} busy={busy === "discard"} disabled={busy !== null}>Discard</Btn>
                <Accent onClick={() => void settleEdit(true)} busy={busy === "keep"} disabled={busy !== null}>Keep</Accent>
              </span>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm md:pr-10">
          <div className="flex flex-wrap gap-1.5">
            {img.setName && <Pill>{img.setName}</Pill>}
            {img.subsetName && <Pill>{img.subsetName}</Pill>}
            {!img.setName && !readOnly && <Pill>Not in a set</Pill>}
            {img.isCover && <Pill tone="ok">Cover</Pill>}
            {retired && <Pill tone="warn">Retired</Pill>}
            {made && <Pill>{made}</Pill>}
            {!img.details && !readOnly && <Pill tone="warn">Not read</Pill>}
          </div>
          {img.luminance !== null && <span className="text-xs text-text-muted tnum">Luminance {Math.round(img.luminance)}</span>}
          {details.length > 0 ? (
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
              {details.map(([k, v]) => (<div key={k} className="contents"><dt className="text-text-muted capitalize">{k.replace(/_/g, " ")}</dt><dd>{Array.isArray(v) ? v.join(", ") : String(v)}</dd></div>))}
            </dl>
          ) : (
            <p className="text-text-muted">{readOnly ? "The two bank libraries carry their pool and category and nothing more." : "No details yet."}</p>
          )}
          {!readOnly && (
            <>
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Set
                <span className="relative">
                  <select value={img.setId ?? ""} disabled={busy !== null} onChange={(e) => void press("move", { setId: e.target.value || null }, e.target.value ? "Moved." : "Taken out of its set.")} aria-label="Move to another set" className="w-full appearance-none rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none disabled:opacity-60">
                    <option value="">Not in a set</option>
                    {sets.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2" />
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => void press("cover", {}, "This is the library's cover now.")} disabled={img.isCover || retired || busy !== null} busy={busy === "cover"}>{img.isCover ? "Is the cover" : "Make cover"}</Btn>
                <Btn onClick={() => void press("black-and-white", {}, "A black and white copy was added beside the original.")} disabled={busy !== null} busy={busy === "black-and-white"}>Black and white</Btn>
                <Btn onClick={() => void removeBackground()} disabled={busy !== null} busy={busy === "cutout"} title="Cuts out a person. It is less sure with objects">Background removal</Btn>
                <Btn onClick={() => void press("read", { intoSets: false }, "Read. Its details are on the right.")} disabled={busy !== null} busy={busy === "read"}><Sparkles className="size-3.5" />{img.details ? "Read again" : "Read with AI"}</Btn>
              </div>
              {busy === "read" && <p role="status" className="text-xs text-text-muted">Reading. This takes about ten seconds.</p>}
              {step && <p role="status" className="text-xs text-text-muted">{step}</p>}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-text-muted">AI edit</span>
                <div className="flex items-end gap-2">
                  <textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={busy !== null || edit !== null} placeholder="Warmer light, like late afternoon" aria-label="What the AI edit should change" className="w-full resize-none rounded-[12px] border border-border bg-bg/60 px-3 py-2 text-sm outline-none placeholder:text-text-placeholder disabled:opacity-60" />
                  <Btn onClick={() => void askEdit()} disabled={!prompt.trim() || busy !== null || edit !== null} busy={busy === "edit"}>Edit</Btn>
                </div>
                {busy === "edit" && <p role="status" className="text-xs text-text-muted">Editing. This takes about fifteen seconds.</p>}
              </div>
            </>
          )}
          {err && <p role="alert" className="text-xs text-danger">{err}</p>}
          {!readOnly && (
            <div className="mt-auto flex items-center border-t border-border pt-3">
              {retired ? (
                <Btn onClick={() => void press("restore", {}, "Restored. It can be picked again.")} busy={busy === "restore"} disabled={busy !== null}>Restore image</Btn>
              ) : (
                <HoldButton onConfirm={() => void press("retire", {}, "Retired. It will not be picked again; decks already saved keep it.")} disabled={busy !== null}>Retire image</HoldButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Uploading {
  key: number;
  file: File;
  preview: string | null;
  state: "waiting" | "uploading" | "failed";
  error?: string;
}

/** The same three words the server knows (higgsfield.ts); the API has no 4:5, so portrait is 3:4. */
type Shape = "portrait" | "tall" | "square";
const SHAPE_WORDS: Record<Shape, string> = { portrait: "Portrait", tall: "Tall", square: "Square" };
const COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** What a picture is made from: one of the library's own, or a reference uploaded for this run. */
type Base = { kind: "image"; id: string; url: string } | { kind: "upload"; path: string; url: string };

/** One picture of a run: asked for, being made, ready for Keep or Discard, or failed with Retry. */
interface Generating {
  key: number;
  runId: number;
  prompt: string;
  shape: Shape;
  base: Base | null;
  state: "waiting" | "generating" | "ready" | "settling" | "failed";
  path?: string;
  url?: string;
  error?: string;
  /** A try-again: the note, and the pending picture it starts from, dropped once the new one arrives. */
  again?: { note: string; from: string };
}

interface AskOne {
  prompt: string;
  shape: Shape;
  base: Base | null;
}

const field = "w-full appearance-none rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none disabled:opacity-60";
const area = "w-full resize-none rounded-[12px] border border-border bg-bg/60 px-3 py-2 text-sm outline-none placeholder:text-text-placeholder disabled:opacity-60";

/**
 * The Generate images form (DEV-30, F7 step 5): what the pictures show, an
 * optional base (one of the library's pictures, or a reference uploaded
 * here, so the face or the place is kept), how many and the shape. It never
 * asks for a set (Garreth, 2026-09-16). "Different directions" (2026-10-22)
 * has the writer turn one instruction into one prompt per picture, shown
 * here to read and change before anything is generated.
 */
function GenerateDialog({ library, onClose, onSubmit }: { library: LibraryDetail; onClose: () => void; onSubmit: (asks: AskOne[]) => void }) {
  const [mode, setMode] = useState<"one" | "directions">("one");
  const [prompt, setPrompt] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [shape, setShape] = useState<Shape>("portrait");
  const [count, setCount] = useState(4);
  const [base, setBase] = useState<Base | null>(null);
  const [busy, setBusy] = useState<"upload" | "write" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const pictures = library.images.filter((i) => i.status === "active").slice(0, 60);
  const ready = mode === "one" ? prompt.trim().length > 0 : lines.some((l) => l.trim());
  const total = mode === "one" ? count : lines.filter((l) => l.trim()).length;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy("upload");
    setErr(null);
    const res = await putIncoming(library.id, file);
    setBusy(null);
    if (res.error) setErr(res.error);
    else setBase({ kind: "upload", path: res.path, url: res.url });
  };
  const write = async () => {
    if (!prompt.trim()) return;
    setBusy("write");
    setErr(null);
    const res = await post<{ prompts: string[] }>(`/api/carousel-generator/libraries/${library.id}/directions`, { instruction: prompt.trim(), count });
    setBusy(null);
    if (res.error || !res.data) setErr(res.error ?? "The directions could not be written");
    else setLines(res.data.prompts);
  };
  const submit = () => {
    if (!ready) return;
    const prompts = mode === "one" ? Array.from({ length: count }, () => prompt.trim()) : lines.map((l) => l.trim()).filter(Boolean);
    onSubmit(prompts.map((p) => ({ prompt: p, shape, base })));
  };
  const tile = "relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-[10px] border bg-card-sunken";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-[var(--scrim)]" />
      <form role="dialog" aria-label="Generate images" onSubmit={(e) => { e.preventDefault(); submit(); }} className="relative flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-card border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Generate images</h2>
          <span role="radiogroup" aria-label="How the prompts are written" className="flex gap-1">
            {([["one", "One prompt"], ["directions", "Different directions"]] as const).map(([m, word]) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", mode === m ? "border-accent bg-card-raised text-text-primary" : "border-border text-text-muted hover:text-text-primary")}>{word}</button>
            ))}
          </span>
        </div>
        <textarea autoFocus rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={1000} placeholder={mode === "one" ? "A woman in her thirties at a kitchen counter, morning light, taken on a phone" : "Before pictures of the woman in different places around her home and her day"} aria-label={mode === "one" ? "What the pictures should show" : "What the pictures should show, and how they should differ"} className={area} />
        {mode === "directions" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Btn onClick={() => void write()} disabled={!prompt.trim() || busy !== null} busy={busy === "write"}>{lines.length ? `Write ${count} again` : `Write ${count} directions`}</Btn>
              {busy === "write" && <span role="status" className="text-xs text-text-muted">Writing</span>}
            </div>
            {lines.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-2 w-5 shrink-0 text-right text-xs text-text-muted tnum">{i + 1}</span>
                <textarea rows={2} value={line} onChange={(e) => setLines((l) => l.map((x, j) => (j === i ? e.target.value : x)))} maxLength={1000} aria-label={`Direction ${i + 1}`} className={area} />
                <button type="button" onClick={() => setLines((l) => l.filter((_, j) => j !== i))} aria-label={`Remove direction ${i + 1}`} className="mt-1.5 flex size-7 shrink-0 items-center justify-center rounded-full text-text-muted hover:text-text-primary"><X className="size-3.5" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-text-muted">Base image</span>
          <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
          <div role="radiogroup" aria-label="Base image" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <button type="button" role="radio" aria-checked={base === null} onClick={() => setBase(null)} className={cn(tile, "flex items-center justify-center text-[11px] font-medium", base === null ? "border-accent text-text-primary" : "border-border text-text-muted hover:text-text-primary")}>None</button>
            <button type="button" role="radio" aria-checked={base?.kind === "upload"} onClick={() => (base?.kind === "upload" ? undefined : picker.current?.click())} disabled={busy === "upload"} aria-label={base?.kind === "upload" ? "The uploaded reference" : "Upload a reference"} className={cn(tile, "flex flex-col items-center justify-center gap-1 text-[11px] font-medium", base?.kind === "upload" ? "border-accent ring-2 ring-accent/40" : "border-dashed border-border text-text-muted hover:text-text-primary")} style={base?.kind === "upload" ? { backgroundImage: `url("${base.url}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
              {base?.kind !== "upload" && (busy === "upload" ? <Loader2 className="size-3.5 animate-spin" /> : <><Upload className="size-3.5" />Upload</>)}
            </button>
            {pictures.map((img) => (
              <button key={img.id} type="button" role="radio" aria-checked={base?.kind === "image" && base.id === img.id} aria-label={img.setName ?? "Image"} onClick={() => setBase({ kind: "image", id: img.id, url: img.url })} className={cn(tile, base?.kind === "image" && base.id === img.id ? "border-accent ring-2 ring-accent/40" : "border-border opacity-80 hover:opacity-100")}>
                <LazyPicture src={img.url} width={240} className="absolute inset-0 block" />
              </button>
            ))}
          </div>
          {base?.kind === "upload" && <button type="button" onClick={() => picker.current?.click()} className="self-start text-xs text-text-muted hover:text-text-primary">Replace the reference</button>}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex w-28 flex-col gap-1 text-xs text-text-muted">
            How many
            <span className="relative">
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} disabled={mode === "directions" && lines.length > 0} aria-label="How many images" className={field}>
                {COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2" />
            </span>
          </label>
          <div className="flex flex-col gap-1 text-xs text-text-muted">
            Shape
            <span role="radiogroup" aria-label="Shape" className="flex gap-1">
              {(Object.keys(SHAPE_WORDS) as Shape[]).map((sh) => (
                <button key={sh} type="button" role="radio" aria-checked={shape === sh} onClick={() => setShape(sh)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", shape === sh ? "border-accent bg-card-raised text-text-primary" : "border-border text-text-muted hover:text-text-primary")}>{SHAPE_WORDS[sh]}</button>
              ))}
            </span>
          </div>
        </div>
        {err && <p role="alert" className="text-xs text-danger">{err}</p>}
        <div className="flex gap-2">
          <Btn onClick={onClose} className="flex-1 py-2.5 text-sm">Cancel</Btn>
          <Accent type="submit" disabled={!ready || busy !== null} className="flex-1"><Sparkles className="size-4" />{total === 0 ? "Generate" : total === 1 ? "Generate 1 image" : `Generate ${total} images`}</Accent>
        </div>
      </form>
    </div>
  );
}

/**
 * One generated picture, large, with what it was made from, Keep, Discard,
 * and a note to try it again (2026-10-22): the same prompt plus the note,
 * starting from this picture so what was right about it stays.
 */
function ReviewModal({ g, onClose, onKeep, onDiscard, onAgain }: { g: Generating; onClose: () => void; onKeep: () => void; onDiscard: () => void; onAgain: (note: string) => void }) {
  const [note, setNote] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    box.current?.focus();
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  const settling = g.state === "settling";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-[var(--scrim)]" />
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Generated picture" className="relative flex max-h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-card border border-border bg-card p-5 outline-none md:flex-row">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-card-raised text-text-muted hover:text-text-primary"><X className="size-[18px]" /></button>
        <span className="block aspect-[4/5] w-full rounded-nested border border-border bg-card-sunken bg-contain bg-center bg-no-repeat md:max-w-sm md:shrink-0" style={{ backgroundImage: `url("${g.url}")` }} role="img" aria-label="The generated picture" />
        <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm md:pr-10">
          <div className="flex flex-wrap gap-1.5"><Pill tone="warn">Not kept yet</Pill><Pill>{SHAPE_WORDS[g.shape]}</Pill>{g.base && <Pill>From a base image</Pill>}</div>
          <p className="text-text-muted">{g.prompt}</p>
          {g.again && <p className="text-xs text-text-muted">Tried again with: {g.again.note}</p>}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-text-muted">Try again with a note</span>
            <div className="flex items-end gap-2">
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} disabled={settling} placeholder="Closer to the window, and no sunglasses" aria-label="What to change" className={area} />
              <Btn onClick={() => onAgain(note.trim())} disabled={!note.trim() || settling}>Again</Btn>
            </div>
          </div>
          {g.error && <p role="alert" className="text-xs text-danger">{g.error}</p>}
          <div className="mt-auto flex items-center justify-end gap-2 border-t border-border pt-3">
            <Btn onClick={onDiscard} disabled={settling}>Discard</Btn>
            <Accent onClick={onKeep} busy={settling} disabled={settling}>Keep</Accent>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tag with AI (DEV-41): which pictures, and whether to file them into sets while reading. */
function TagDialog({ library, onClose, onStart }: { library: LibraryDetail; onClose: () => void; onStart: (which: "unread" | "all", intoSets: boolean) => void }) {
  const active = library.images.filter((i) => i.status === "active");
  const unread = active.filter((i) => !i.details).length;
  const [which, setWhich] = useState<"unread" | "all">(unread > 0 ? "unread" : "all");
  const [intoSets, setIntoSets] = useState(false);
  const n = which === "unread" ? unread : active.length;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-[var(--scrim)]" />
      <form role="dialog" aria-label="Tag with AI" onSubmit={(e) => { e.preventDefault(); if (n > 0) onStart(which, intoSets); }} className="relative flex w-full max-w-sm flex-col gap-4 rounded-card border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Tag with AI</h2>
        <span role="radiogroup" aria-label="Which images" className="flex flex-col gap-1.5">
          {([["unread", `Not read yet (${unread})`], ["all", `All (${active.length})`]] as const).map(([w, word]) => (
            <button key={w} type="button" role="radio" aria-checked={which === w} onClick={() => setWhich(w)} className={cn("rounded-nested border px-3 py-2 text-left text-sm transition-colors", which === w ? "border-accent bg-card-raised text-text-primary" : "border-border text-text-muted hover:text-text-primary")}>{word}</button>
          ))}
        </span>
        {library.sets.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={intoSets} onChange={(e) => setIntoSets(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            File into sets while reading
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Accent type="submit" disabled={n === 0}>{n === 1 ? "Read 1 image" : `Read ${n} images`}</Accent>
        </div>
      </form>
    </div>
  );
}

export function LibraryDetailView({ id, initial }: { id: string; initial: LibraryDetail | null }) {
  const { data, error, reload } = useJson<{ library: LibraryDetail }>(`/api/carousel-generator/libraries/${id}`, { initial: initial ? { library: initial } : null });
  const lib = data?.library ?? initial;
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const remove = async () => {
    setDeleting("busy");
    const res = await post(`/api/carousel-generator/libraries/${id}`, undefined, "DELETE");
    if (res.error) { setDeleting(res.error); return; }
    router.push("/carousel-generator/library" as never);
  };
  const [set, setSet] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newSet, setNewSet] = useState(false);
  const [setName, setSetName] = useState("");
  const [busy, setBusy] = useState(false);
  const [setErr, setSetErr] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Uploading[]>([]);
  const [gens, setGens] = useState<Generating[]>([]);
  const [generating, setGenerating] = useState(false);
  const [reviewKey, setReviewKey] = useState<number | null>(null);
  const genQueue = useRef<Generating[]>([]);
  const genRunning = useRef(0);
  const nextRun = useRef(1);
  // A run's uploaded reference stays in incoming/ until its last picture has returned.
  const runs = useRef(new Map<number, { path: string; left: number }>());
  const [tagging, setTagging] = useState(false);
  const [tagRun, setTagRun] = useState<{ total: number; done: number; failed: number; running: boolean } | null>(null);
  const tagStop = useRef(false);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const nextKey = useRef(1);
  const running = useRef(0);
  const queue = useRef<Uploading[]>([]);
  const shown = useMemo(() => {
    if (!lib) return [];
    if (!set) return lib.images;
    const s = lib.sets.find((x) => x.id === set);
    if (!s) return lib.images;
    const parent = s.parentId ? lib.sets.find((p) => p.id === s.parentId) : null;
    return lib.images.filter((i) => (parent ? i.setName === parent.name && i.subsetName === s.name : i.setName === s.name));
  }, [lib, set]);

  // Three at a time. A file that fails stays as a tile with Retry; the rest carry on.
  function pump(target: string | null) {
    while (running.current < 3 && queue.current.length) {
      const next = queue.current.shift()!;
      running.current++;
      setUploads((u) => u.map((x) => (x.key === next.key ? { ...x, state: "uploading", error: undefined } : x)));
      void uploadPicture(id, next.file, { setId: target }).then((res) => {
        running.current--;
        if (res.error) setUploads((u) => u.map((x) => (x.key === next.key ? { ...x, state: "failed", error: res.error ?? "Failed" } : x)));
        else {
          setUploads((u) => u.filter((x) => x.key !== next.key));
          if (next.preview) URL.revokeObjectURL(next.preview);
          reload();
        }
        pump(target);
      });
    }
  }
  const add = (files: FileList | File[] | null) => {
    if (!files || !lib || lib.readOnly) return;
    const list = [...files].slice(0, 60);
    const fresh: Uploading[] = list.map((file) => {
      const type = pictureType(file);
      const showable = type !== null && !/hei[cf]/.test(type);
      return { key: nextKey.current++, file, preview: showable ? URL.createObjectURL(file) : null, state: type ? ("waiting" as const) : ("failed" as const), error: type ? undefined : "Not a picture this library can take" };
    });
    setUploads((u) => [...fresh, ...u]);
    queue.current.push(...fresh.filter((f) => f.state === "waiting"));
    setNote(null);
    pump(set);
  };
  const retry = (u: Uploading) => {
    if (!pictureType(u.file)) return;
    queue.current.push(u);
    pump(set);
  };

  // Two at a time: each picture waits on Higgsfield and then on the
  // watermark remover's GPU. A picture that fails stays as a tile with
  // Retry; the key or the balance failing fails every waiting tile at once.
  const runDone = (runId: number) => {
    const run = runs.current.get(runId);
    if (!run) return;
    run.left--;
    if (run.left <= 0) {
      runs.current.delete(runId);
      void post(`/api/carousel-generator/libraries/${id}/images`, { path: run.path, discard: true });
    }
  };
  function pumpGen() {
    while (genRunning.current < 2 && genQueue.current.length) {
      const next = genQueue.current.shift()!;
      genRunning.current++;
      setGens((g) => g.map((x) => (x.key === next.key ? { ...x, state: "generating", error: undefined } : x)));
      const body = {
        prompt: next.again ? `${next.prompt}. Change: ${next.again.note}` : next.prompt,
        shape: next.shape,
        baseImageId: !next.again && next.base?.kind === "image" ? next.base.id : null,
        basePath: next.again ? next.again.from : next.base?.kind === "upload" ? next.base.path : null,
      };
      void post<{ path: string; url: string }>(`/api/carousel-generator/libraries/${id}/generate`, body).then((res) => {
        genRunning.current--;
        if (res.error || !res.data) {
          const reason = res.error ?? "Failed";
          const also = new Set(res.code === "run_blocked" ? genQueue.current.map((w) => w.key) : []);
          if (also.size) {
            for (const w of genQueue.current) runDone(w.runId);
            genQueue.current = [];
          }
          // A failed try-again keeps the picture it started from.
          setGens((g) => g.map((x) => (x.key === next.key ? (x.again ? { ...x, state: "ready", error: reason, again: undefined } : { ...x, state: "failed", error: reason }) : also.has(x.key) ? { ...x, state: "failed", error: reason } : x)));
        } else {
          const { path, url } = res.data;
          if (next.again) void post(`/api/carousel-generator/libraries/${id}/images`, { path: next.again.from, discard: true });
          setGens((g) => g.map((x) => (x.key === next.key ? { ...x, state: "ready", path, url, error: undefined } : x)));
        }
        runDone(next.runId);
        pumpGen();
      });
    }
  }
  const startRun = (asks: AskOne[]) => {
    const runId = nextRun.current++;
    const upload = asks[0]?.base?.kind === "upload" ? asks[0].base : null;
    if (upload) runs.current.set(runId, { path: upload.path, left: asks.length });
    const fresh: Generating[] = asks.map((a) => ({ key: nextKey.current++, runId, prompt: a.prompt, shape: a.shape, base: a.base, state: "waiting" }));
    setGens((g) => [...fresh, ...g]);
    genQueue.current.push(...fresh);
    setGenerating(false);
    setNote(null);
    pumpGen();
  };
  const retryGen = (g: Generating) => {
    const run = runs.current.get(g.runId);
    if (run) run.left++;
    setGens((x) => x.map((y) => (y.key === g.key ? { ...y, state: "waiting", error: undefined } : y)));
    genQueue.current.push(g);
    pumpGen();
  };
  // Try again with a note: the same prompt plus the note, from this picture.
  const againGen = (g: Generating, note: string) => {
    if (!g.path) return;
    const next: Generating = { ...g, state: "waiting", error: undefined, again: { note, from: g.path }, path: undefined, url: undefined };
    setGens((x) => x.map((y) => (y.key === g.key ? next : y)));
    setReviewKey(null);
    genQueue.current.push(next);
    pumpGen();
  };
  // Keep lands the picture in the library, in no set; Discard drops the pending file.
  const settleGen = async (g: Generating, keep: boolean) => {
    if (!g.path) return;
    setGens((x) => x.map((y) => (y.key === g.key ? { ...y, state: "settling", error: undefined } : y)));
    const res = await post(`/api/carousel-generator/libraries/${id}/images`, keep ? { path: g.path, madeBy: "generated", derivedFrom: g.base?.kind === "image" ? g.base.id : null, prompt: g.again ? `${g.prompt}. Change: ${g.again.note}` : g.prompt, setId: null } : { path: g.path, discard: true });
    if (res.error) {
      setGens((x) => x.map((y) => (y.key === g.key ? { ...y, state: "ready", error: res.error ?? "Failed" } : y)));
      return;
    }
    setGens((x) => x.filter((y) => y.key !== g.key));
    setReviewKey((k) => (k === g.key ? null : k));
    if (keep) {
      setNote("Kept. It is in the library and not yet read.");
      reload();
    }
  };
  // Tag with AI (DEV-41): two at a time, with a Stop; the page reloads at the end.
  const startTagging = (which: "unread" | "all", intoSets: boolean) => {
    if (!lib) return;
    const list = lib.images.filter((i) => i.status === "active" && (which === "all" || !i.details));
    setTagging(false);
    tagStop.current = false;
    setTagRun({ total: list.length, done: 0, failed: 0, running: true });
    const queue = [...list];
    const worker = async () => {
      while (queue.length && !tagStop.current) {
        const img = queue.shift()!;
        const res = await post(`/api/carousel-generator/libraries/${id}/images/${encodeURIComponent(img.id)}/read`, { intoSets });
        setTagRun((t) => (t ? { ...t, done: t.done + 1, failed: t.failed + (res.error ? 1 : 0) } : t));
      }
    };
    void Promise.all([worker(), worker()]).then(() => {
      setTagRun((t) => (t ? { ...t, running: false } : t));
      reload();
    });
  };

  if (!lib) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold">Library</h1>
        <LoadError message={error ?? "The library could not be loaded"} onRetry={reload} />
      </div>
    );
  }
  const tops = lib.sets.filter((s) => !s.parentId);
  const current = set ? lib.sets.find((s) => s.id === set) ?? null : null;
  const open = openId ? lib.images.find((i) => i.id === openId) ?? null : null;
  const createSet = async () => {
    if (!setName.trim()) return;
    setBusy(true);
    setSetErr(null);
    const res = await post(`/api/carousel-generator/libraries/${id}/sets`, { name: setName.trim(), parentId: current && !current.parentId ? current.id : null });
    setBusy(false);
    if (res.error) { setSetErr(/duplicate|unique/i.test(res.error) ? "There is already a set with that name here" : res.error); return; }
    setNewSet(false);
    setSetName("");
    reload();
  };
  const uploadBtn = (
    <Accent onClick={() => picker.current?.click()}><Upload className="size-3.5" />{current ? `Upload to ${current.name}` : "Upload"}</Accent>
  );
  const failed = uploads.filter((u) => u.state === "failed").length;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <PageHead
        back={{ href: "/carousel-generator/library", label: "Image libraries" }}
        title={lib.name}
        meta={<><Pill className="tnum">{lib.count} images</Pill>{lib.linked ? <Pill>Linked · {lib.linked.bucket}{lib.linked.prefix ? `/${lib.linked.prefix}` : ""}</Pill> : lib.readOnly && <Pill>Read-only</Pill>}{lib.untagged > 0 && <Pill tone="warn" className="tnum">{lib.untagged} unread</Pill>}</>}
        actions={
          <>
            {!lib.readOnly && (
              <>
                <Btn onClick={() => setGenerating(true)}><Sparkles className="size-3.5" />Generate images</Btn>
                <Btn onClick={() => setTagging(true)} disabled={tagRun?.running} busy={tagRun?.running}>Tag with AI</Btn>
                <Btn onClick={() => { setSetErr(null); setNewSet(true); }}><Plus className="size-3" />New set</Btn>
                {uploadBtn}
              </>
            )}
            {(lib.linked || !lib.readOnly) && (
              <HoldButton onConfirm={() => void remove()} disabled={deleting === "busy" || lib.usedBy.length > 0} className="bg-transparent border border-border text-text-muted">{lib.linked ? "Remove link" : "Delete library"}</HoldButton>
            )}
          </>
        }
      />
      {lib.usedBy.length > 0 && (lib.linked || !lib.readOnly) && <p className="text-xs text-text-muted">Used by {lib.usedBy.join(", ")}, so it cannot be deleted until {lib.usedBy.length === 1 ? "that type points" : "those types point"} at another library.</p>}
      {deleting && deleting !== "busy" && <p role="alert" className="text-xs text-danger">{deleting}</p>}
      <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {tagRun && (
        <p role="status" className="flex items-center gap-3 text-xs text-text-muted tnum">
          {tagRun.running ? `Reading ${Math.min(tagRun.done + 1, tagRun.total)} of ${tagRun.total}` : `Read ${tagRun.done - tagRun.failed} of ${tagRun.total}`}
          {tagRun.failed > 0 && <span className="text-danger">{tagRun.failed} failed</span>}
          {tagRun.running ? <button type="button" onClick={() => { tagStop.current = true; }} className="rounded-full border border-border px-2.5 py-0.5 font-medium hover:text-text-primary">Stop</button> : <button type="button" onClick={() => setTagRun(null)} className="hover:text-text-primary">Dismiss</button>}
        </p>
      )}
      {(note || failed > 0) && (
        <p role="status" className={cn("text-xs", failed > 0 ? "text-danger" : "text-text-muted")}>
          {failed > 0 ? `${failed} ${failed === 1 ? "upload" : "uploads"} failed. Retry each one on its tile.` : note}
        </p>
      )}
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
        <div
          className={cn("flex flex-1 flex-col rounded-card", over && "outline-2 outline-dashed outline-accent")}
          onDragOver={(e) => { if (!lib.readOnly && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { if (lib.readOnly) return; e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        >
          {shown.length === 0 && uploads.length === 0 && gens.length === 0 ? (
            <div className="flex flex-1 flex-col rounded-card border border-border bg-card p-5">
              <EmptyState icon={Images}>{lib.images.length === 0 ? "No images yet" : "Nothing in this set"}</EmptyState>
              {!lib.readOnly && (
                <div className="flex flex-col items-center gap-1 pb-4">
                  {/* In an empty library Generate images is the accent and Upload sits beside it (F7). */}
                  {lib.images.length === 0 ? (
                    <span className="flex flex-wrap justify-center gap-2">
                      <Accent onClick={() => setGenerating(true)}><Sparkles className="size-4" />Generate images</Accent>
                      <Btn onClick={() => picker.current?.click()}><Upload className="size-3.5" />Upload</Btn>
                    </span>
                  ) : uploadBtn}
                  <span className="text-xs text-text-muted">or drop pictures here. JPEG, PNG, WebP or HEIC, up to 20 MB each</span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {/* The review row (F7 step 6): a generated picture joins the library only on Keep. */}
              {gens.map((g) => (
                <div key={`g${g.key}`} role="group" aria-label={g.state === "failed" ? "Generation failed" : g.state === "ready" || g.state === "settling" ? "Generated, not kept yet" : "Generating"} className={cn("relative flex aspect-[4/5] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[10px] border bg-card-sunken p-2 text-center", g.state === "failed" ? "border-dashed border-danger" : g.state === "ready" || g.state === "settling" ? "border-accent" : "border-border")}>
                  {g.url && g.state !== "failed" && <LazyPicture src={g.url} width={400} className="absolute inset-0 block" />}
                  {(g.state === "ready" || g.state === "settling") && <button type="button" onClick={() => setReviewKey(g.key)} aria-label="Open the generated picture" className="absolute inset-0 cursor-zoom-in" />}
                  {g.state === "failed" ? (
                    <>
                      <span className="text-[11px] font-medium text-danger">Failed</span>
                      <span className="line-clamp-4 text-[10px] leading-3 text-text-muted">{g.error}</span>
                      <span className="flex gap-1.5">
                        <button type="button" onClick={() => retryGen(g)} className="rounded-full bg-card-raised px-2 py-0.5 text-[11px] font-medium hover:text-text-primary">Retry</button>
                        <button type="button" onClick={() => setGens((x) => x.filter((y) => y.key !== g.key))} className="rounded-full px-2 py-0.5 text-[11px] text-text-muted hover:text-text-primary">Remove</button>
                      </span>
                    </>
                  ) : g.state === "ready" || g.state === "settling" ? (
                    <>
                      <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-full bg-black/50 px-1.5 text-[10px] leading-4 text-white">Not kept yet</span>
                      {g.error && <span role="alert" className="absolute inset-x-1.5 top-7 rounded bg-black/60 px-1.5 text-[10px] leading-4 text-danger">{g.error}</span>}
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1.5">
                        <button type="button" onClick={() => void settleGen(g, false)} disabled={g.state === "settling"} className="rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50">Discard</button>
                        <button type="button" onClick={() => void settleGen(g, true)} disabled={g.state === "settling"} className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-bg disabled:opacity-50">Keep</button>
                      </span>
                    </>
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[11px] font-medium text-white">{g.state === "waiting" ? "Waiting" : g.again ? "Trying again" : "Generating"}</span>
                  )}
                </div>
              ))}
              {uploads.map((u) => (
                <div key={`u${u.key}`} role="group" aria-label={u.state === "failed" ? `${u.file.name} failed` : `Uploading ${u.file.name}`} className={cn("relative flex aspect-[4/5] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[10px] border bg-card-sunken bg-cover bg-center p-2 text-center", u.state === "failed" ? "border-dashed border-danger" : "border-border")} style={u.preview && u.state !== "failed" ? { backgroundImage: `url("${u.preview}")` } : undefined}>
                  {u.state === "failed" ? (
                    <>
                      <span className="text-[11px] font-medium text-danger">Failed</span>
                      <span className="line-clamp-3 text-[10px] leading-3 text-text-muted">{u.error}</span>
                      <span className="flex gap-1.5">
                        {pictureType(u.file) && <button type="button" onClick={() => retry(u)} className="rounded-full bg-card-raised px-2 py-0.5 text-[11px] font-medium hover:text-text-primary">Retry</button>}
                        <button type="button" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))} className="rounded-full px-2 py-0.5 text-[11px] text-text-muted hover:text-text-primary">Remove</button>
                      </span>
                    </>
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[11px] font-medium text-white">{u.state === "waiting" ? "Waiting" : "Uploading"}</span>
                  )}
                </div>
              ))}
              {shown.map((img) => (
                <button key={img.id} type="button" onClick={() => setOpenId(img.id)} aria-label={`${img.setName ?? "Image"}${img.subsetName ? ` · ${img.subsetName}` : ""}${img.status !== "active" ? ", retired" : ""}`} className={cn("relative aspect-[4/5] overflow-hidden rounded-[10px] border border-border bg-card-sunken transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]", img.status !== "active" && "opacity-40")}>
                  {/* A small copy, fetched only when the tile is near the screen (2026-10-09): the grid used to ask for every original at once. */}
                  <LazyPicture src={img.url} width={400} className="absolute inset-0 block" />
                  {img.isCover && <span className="absolute top-1.5 left-1.5 rounded-full bg-black/50 px-1.5 text-[10px] leading-4 text-white">Cover</span>}
                  {img.status !== "active" && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-1.5 text-[10px] leading-4 text-white">Retired</span>}
                  {!img.details && !lib.readOnly && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-warn" aria-hidden />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {open && <ImageModal key={open.id} img={open} library={lib} onClose={() => setOpenId(null)} onChanged={(n) => { setNote(n ?? null); reload(); }} />}
      {generating && <GenerateDialog library={lib} onClose={() => setGenerating(false)} onSubmit={startRun} />}
      {tagging && <TagDialog library={lib} onClose={() => setTagging(false)} onStart={startTagging} />}
      {reviewKey !== null && (() => { const g = gens.find((x) => x.key === reviewKey); return g && g.url ? <ReviewModal key={g.key} g={g} onClose={() => setReviewKey(null)} onKeep={() => void settleGen(g, true)} onDiscard={() => void settleGen(g, false)} onAgain={(n) => againGen(g, n)} /> : null; })()}
      {newSet && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div aria-hidden onClick={() => setNewSet(false)} className="absolute inset-0 bg-[var(--scrim)]" />
          <form role="dialog" aria-label="New set" onSubmit={(e) => { e.preventDefault(); void createSet(); }} className="relative flex w-full max-w-sm flex-col gap-3 rounded-card border border-border bg-card p-5">
            <h2 className="text-base font-semibold">New set{current && !current.parentId ? ` in ${current.name}` : ""}</h2>
            <input autoFocus value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="Name" aria-label="Set name" maxLength={80} className="w-full rounded-nested border border-border bg-bg/60 px-3.5 py-2 text-sm outline-none placeholder:text-text-muted" />
            {setErr && <p role="alert" className="text-xs text-danger">{setErr}</p>}
            <div className="flex justify-end gap-2"><Btn onClick={() => setNewSet(false)}>Cancel</Btn><Accent type="submit" disabled={!setName.trim()} busy={busy}>Create</Accent></div>
          </form>
        </div>
      )}
    </div>
  );
}
