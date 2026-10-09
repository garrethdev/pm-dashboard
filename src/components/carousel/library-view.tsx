"use client";

/**
 * Image libraries (D8, approved 2026-09-16; DEV-19c read-only, DEV-29 new,
 * upload and retire). The grid of libraries with a New library tile at the
 * end; inside one, the sets as a rail with the images in a grid, Upload
 * with a tile per file, and the image modal with what can be done to one
 * image. Generate images and Tag with AI are other tickets and say so.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Accent, Btn, LoadError, PageHead, Pill, post, useJson } from "@/components/carousel/kit";
import { EmptyState } from "@/components/ui/empty-state";
import { cutOut, pictureType, uploadPicture } from "@/components/carousel/library-upload";
import { LazyPicture } from "@/components/carousel/lazy-picture";
import { HoldButton } from "@/components/ui/hold-button";
import { ChevronDown, Images, Plus, Sparkles, Upload, X } from "@/components/ui/icons";
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
    const res = await post(`${base}/${img.id}/${action}`, body ?? {});
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
    const res = await post<{ path: string; url: string; prompt: string }>(`${base}/${img.id}/edit`, { prompt: prompt.trim() });
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
  const made = img.madeBy === "black_and_white" ? "Black and white copy" : img.madeBy === "background_removal" ? "Cut-out" : img.madeBy === "ai_edit" ? "AI edit" : null;

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
            <p className="text-text-muted">{readOnly ? "The two bank libraries carry their pool and category and nothing more." : "No details yet. Reading an image with AI is not connected yet."}</p>
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
              </div>
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
                <span className="hidden gap-2 sm:flex">
                  <Btn disabled title="Higgsfield is not connected yet"><Sparkles className="size-3.5" />Generate images</Btn>
                  <Btn disabled title="Not connected yet">Tag with AI</Btn>
                </span>
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
          {shown.length === 0 && uploads.length === 0 ? (
            <div className="flex flex-1 flex-col rounded-card border border-border bg-card p-5">
              <EmptyState icon={Images}>{lib.images.length === 0 ? "No images yet" : "Nothing in this set"}</EmptyState>
              {!lib.readOnly && (
                <div className="flex flex-col items-center gap-1 pb-4">
                  {uploadBtn}
                  <span className="text-xs text-text-muted">or drop pictures here. JPEG, PNG, WebP or HEIC, up to 20 MB each</span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
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
