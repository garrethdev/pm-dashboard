"use client";

/**
 * The Studio's left panel, Adjustments (D6-Main, D11-Layers; Garreth's
 * list of 2026-10-08): the slide size, the selected text box's name, writer,
 * fit, font and weight, size, stroke, shadow with offset and blur, alignment,
 * wrap width, colour and sample text; the selected image cell's set and
 * pinned picture; the slide's layers; and the library with its sets and
 * thumbnails, which drag onto a slide's cell. Upload images adds to the
 * library; Generate with AI is not connected yet.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Btn, Pill } from "@/components/carousel/kit";
import { LazyPicture } from "@/components/carousel/lazy-picture";
import { uploadPicture } from "@/components/carousel/library-upload";
import { COLOURS, SIZES, WEIGHT_NAMES, fitsChars, fontOf, lookOf, pinOf, wrapWidthOf, type Box, type Contract, type Selection, type StudioSize, type Template } from "@/components/carousel/studio-model";
import { ArrowLineDown, ArrowLineUp, Check, ChevronDown, ImageIcon, Loader2, Minus, Plus, SidebarSimple, Sparkles, TextAlignCenter, TextAlignLeft, TextAlignRight, TextT, Trash, Upload } from "@/components/ui/icons";
import { SLIDE_FONTS } from "@/lib/carousel/fonts";
import { thumbUrl } from "@/lib/carousel/thumb";
import { cn } from "@/lib/utils";
import type { Library, LibraryDetail, LibraryImage } from "@/server/carousel/repo/types";

export const IMAGE_DRAG = "application/x-carousel-image";

export type PanelProps = {
  t: Template | null;
  size: StudioSize;
  onSize: (s: StudioSize) => void;
  selected: Selection | null;
  onSelect: (s: Selection | null) => void;
  copy: Record<string, string>;
  onCopy: (role: string, text: string) => void;
  onBox: (patch: Partial<Box>) => void;
  onRename: (next: string) => void;
  onWriter: (writer: Contract["writer"], fixed?: string) => void;
  onAddBox: () => void;
  onRemoveBox: (role: string) => void;
  onLayer: (role: string, dir: -1 | 1) => void;
  onPool: (slide: number, set: string | null) => void;
  onPin: (slide: number, cell: number, pin: { url: string; image_id?: string } | null) => void;
  libraries: Library[];
  libraryId: string | null;
  onLibrary: (id: string | null) => void;
  onFold: () => void;
};

export function Adjustments(p: PanelProps) {
  const { t, selected } = p;
  const slide = t && selected ? t.slides[selected.slide] : null;
  const box = slide && selected?.box ? (slide.text.find((b) => b.role === selected.box) ?? null) : null;
  const cell = slide && selected?.cell !== null && selected?.cell !== undefined ? selected.cell : null;
  const library = p.libraries.find((l) => l.id === p.libraryId) ?? null;

  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto rounded-card border border-border bg-card" aria-label="Adjustments">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[11px] font-medium tracking-[0.12em] text-text-muted uppercase">Adjustments</span>
        <button type="button" onClick={p.onFold} aria-label="Hide adjustments" className="text-text-muted hover:text-text-primary"><SidebarSimple className="size-4" /></button>
      </div>

      <section className="flex flex-col gap-2 border-b border-border p-4">
        <b className="text-sm">Slide size</b>
        <div role="radiogroup" aria-label="Slide size" className="grid grid-cols-2 gap-2">
          {(["4:5", "9:16"] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={p.size === s} onClick={() => p.onSize(s)} className={cn("flex items-center gap-2 rounded-nested border px-3 py-2 text-left", p.size === s ? "border-text-primary" : "border-border hover:border-text-muted/50")}>
              <span className={cn("block shrink-0 rounded-[3px] border border-current", s === "4:5" ? "h-4 w-3.5" : "h-5 w-3")} aria-hidden />
              <span className="flex flex-col"><b className="text-xs tnum">{s}</b><span className="text-[10px] text-text-muted tnum">{SIZES[s].width}×{SIZES[s].height}</span></span>
            </button>
          ))}
        </div>
      </section>

      {box && t && slide ? <BoxInspector t={t} slide={selected!.slide} box={box} copy={p.copy} onCopy={p.onCopy} onBox={p.onBox} onRename={p.onRename} onWriter={p.onWriter} onRemove={() => p.onRemoveBox(box.role)} /> : null}

      {slide && t && cell !== null && !box && (
        <section className="flex flex-col gap-3 border-b border-border p-4 text-sm">
          <div className="flex items-center justify-between gap-2"><b>Slide {slide.n} · Image {cell + 1}</b><Pill>Image cell</Pill></div>
          <Row label="Draws from">
            <select value={slide.images.pools?.[0] ?? ""} onChange={(e) => p.onPool(selected!.slide, e.target.value || null)} aria-label="Draws from" className="max-w-40 rounded-nested border border-border bg-bg/60 px-2 py-1 text-xs text-text-primary">
              <option value="">Whole library</option>
              {library?.sets.filter((s) => !s.parentId).map((s) => <option key={s.id} value={s.name}>{s.name} · {s.count}</option>)}
            </select>
          </Row>
          {pinOf(slide, cell) ? (
            <div className="flex items-center gap-3 rounded-nested border border-border p-2">
              <span className="block size-12 shrink-0 rounded-[6px] bg-card-sunken bg-cover bg-center" style={{ backgroundImage: `url("${thumbUrl(pinOf(slide, cell)!.url, 160)}")` }} aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col text-xs"><b>Pinned picture</b><span className="text-text-muted">Only this slide uses it.</span></span>
              <Btn onClick={() => p.onPin(selected!.slide, cell, null)}>Unpin</Btn>
            </div>
          ) : (
            <p className="text-xs text-text-muted">Drag a picture from the library below onto this cell, or click one, to pin it to this slide only. Every deck then shows the same picture here.</p>
          )}
        </section>
      )}

      {slide && t && (
        <section className="flex flex-col gap-1 border-b border-border p-4" aria-label="Layers">
          <div className="flex items-center justify-between">
            <b className="text-sm">Layers</b>
            <span className="flex items-center gap-1 text-xs text-text-muted">Slide {slide.n}
              <button type="button" disabled={!box} onClick={() => box && p.onLayer(box.role, 1)} aria-label="Bring forward" className="ml-1 rounded p-0.5 hover:text-text-primary disabled:opacity-40"><ArrowLineUp className="size-3.5" /></button>
              <button type="button" disabled={!box} onClick={() => box && p.onLayer(box.role, -1)} aria-label="Send back" className="rounded p-0.5 hover:text-text-primary disabled:opacity-40"><ArrowLineDown className="size-3.5" /></button>
            </span>
          </div>
          <ul className="flex flex-col">
            {[...slide.text].reverse().map((b) => {
              const c = t.copy_contract.find((x) => x.role === b.role);
              const on = selected?.box === b.role;
              return (
                <li key={b.role}>
                  <button type="button" onClick={() => p.onSelect({ slide: selected!.slide, box: b.role, cell: null })} aria-pressed={on} className={cn("flex w-full items-center gap-2 rounded-nested px-2 py-1.5 text-left text-sm", on ? "bg-card-raised" : "hover:bg-card-raised/60")}>
                    <TextT className="size-3.5 text-text-muted" /><span className="min-w-0 flex-1 truncate">{b.role}</span>
                    <Pill tone={c?.writer === "ai" || !c ? "accent" : "neutral"}>{c?.writer === "fixed" ? "Fixed" : c?.writer === "per_batch" ? "Per batch" : "AI"}</Pill>
                  </button>
                </li>
              );
            })}
            {slide.cells.map((_, k) => {
              const on = selected?.cell === k && !selected?.box;
              const pin = pinOf(slide, k);
              return (
                <li key={`cell-${k}`}>
                  <button type="button" onClick={() => p.onSelect({ slide: selected!.slide, box: null, cell: k })} aria-pressed={on} className={cn("flex w-full items-center gap-2 rounded-nested px-2 py-1.5 text-left text-sm", on ? "bg-card-raised" : "hover:bg-card-raised/60")}>
                    <ImageIcon className="size-3.5 text-text-muted" /><span className="min-w-0 flex-1 truncate">Image {slide.cells.length > 1 ? k + 1 : ""}</span>
                    <Pill tone={pin ? "accent" : "neutral"}>{pin ? "Pinned" : slide.images.pools?.[0] ? "Set" : "Library"}</Pill>
                  </button>
                </li>
              );
            })}
          </ul>
          <Btn onClick={p.onAddBox} className="mt-1 self-start"><Plus className="size-3" />Text box</Btn>
        </section>
      )}

      <LibraryPane libraries={p.libraries} libraryId={p.libraryId} onLibrary={p.onLibrary} selected={selected} slide={slide} onPin={p.onPin} />
    </aside>
  );
}

function BoxInspector({ t, slide, box, copy, onCopy, onBox, onRename, onWriter, onRemove }: { t: Template; slide: number; box: Box; copy: Record<string, string>; onCopy: (role: string, text: string) => void; onBox: (patch: Partial<Box>) => void; onRename: (next: string) => void; onWriter: (writer: Contract["writer"], fixed?: string) => void; onRemove: () => void }) {
  const contract = t.copy_contract.find((c) => c.role === box.role);
  const writer = contract?.writer ?? "ai";
  const f = fontOf(box, t);
  const look = lookOf(box, t);
  const cw = t.canvas.width;
  const shadowKind = look.shadow?.kind ?? "off";
  const setShadow = (kind: "off" | "hard" | "soft", offset = look.shadow?.dx ?? 6, blur = look.shadow?.blur ?? 12) =>
    onBox({ shadow: kind === "off" ? null : { kind, dx: offset, dy: offset, blur, color: "#000000", opacity: 0.6, stroked: false } });
  return (
    <section className="flex flex-col gap-3 border-b border-border p-4 text-sm">
      <div className="flex items-center justify-between gap-2"><b className="truncate">Slide {t.slides[slide].n} · {box.role}</b><Pill>Text box</Pill></div>
      <Row label="Name">
        <input defaultValue={box.role} key={box.role} onBlur={(e) => onRename(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} aria-label="Name" className="w-40 rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none" />
      </Row>
      <div className="flex flex-col gap-1.5 text-xs text-text-muted">Written by
        <div role="radiogroup" aria-label="Written by" className="grid grid-cols-3 rounded-full bg-card-raised p-0.5">
          {(["ai", "fixed", "per_batch"] as const).map((w) => <button key={w} type="button" role="radio" aria-checked={writer === w} onClick={() => onWriter(w)} className={cn("rounded-full px-2 py-1 text-xs font-medium", writer === w ? "bg-accent text-bg" : "text-text-muted")}>{w === "ai" ? "AI" : w === "fixed" ? "Fixed" : "Per batch"}</button>)}
        </div>
        {writer !== "ai" && <input value={contract?.fixed ?? ""} onChange={(e) => onWriter(writer, e.target.value)} placeholder="the words on every deck" aria-label="Fixed words" className="rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none" />}
      </div>
      <Row label="Fits"><span className="text-xs tnum">{fitsChars(box, t)} characters</span></Row>
      <Row label="Font">
        <Select value={f.key} ariaLabel="Font" onChange={(v) => onBox({ font: v, weight: undefined })}>
          {!SLIDE_FONTS.some((s) => s.key === f.key) && <option value={f.key}>{f.family}</option>}
          {SLIDE_FONTS.map((s) => <option key={s.key} value={s.key}>{s.family} · {s.feel}</option>)}
        </Select>
      </Row>
      <Row label="Weight">
        <Select value={String(f.weight)} ariaLabel="Weight" onChange={(v) => onBox({ weight: Number(v) })}>
          {!f.font.weights.includes(f.weight) && <option value={String(f.weight)}>{WEIGHT_NAMES[f.weight] ?? f.weight}</option>}
          {f.font.weights.map((w) => <option key={w} value={String(w)}>{WEIGHT_NAMES[w] ?? w}</option>)}
        </Select>
      </Row>
      <Row label="Size"><Step value={box.size} min={16} max={200} step={2} unit="px" onChange={(v) => onBox({ size: v })} /></Row>
      <Row label="Stroke">
        <span className="flex items-center gap-2">
          <Toggle on={Boolean(look.stroke && look.stroke.width > 0)} label="Stroke" onChange={(on) => onBox({ stroke: on ? { width: look.stroke?.width || 4, color: look.stroke?.color ?? "#000000" } : null })} />
          <Step value={look.stroke?.width ?? 0} min={0} max={24} unit="px" disabled={!look.stroke} onChange={(v) => onBox({ stroke: v === 0 ? null : { width: v, color: look.stroke?.color ?? "#000000" } })} />
        </span>
      </Row>
      <Row label="Shadow">
        <Seg value={shadowKind} options={[["off", "Off"], ["hard", "Hard"], ["soft", "Soft"]]} ariaLabel="Shadow" onChange={(v) => setShadow(v as "off" | "hard" | "soft")} />
      </Row>
      {look.shadow && (
        <Row label="Offset">
          <span className="flex items-center gap-2">
            <Step value={look.shadow.dx} min={0} max={40} unit="px" onChange={(v) => setShadow(look.shadow!.kind, v, look.shadow!.blur)} />
            <span className="text-[11px]">Blur</span>
            <Step value={look.shadow.blur} min={0} max={60} unit="px" disabled={look.shadow.kind === "hard"} onChange={(v) => setShadow(look.shadow!.kind, look.shadow!.dx, v)} />
          </span>
        </Row>
      )}
      <Row label="Alignment">
        <div role="radiogroup" aria-label="Alignment" className="inline-flex rounded-full bg-card-raised p-0.5">
          {([["left", TextAlignLeft], ["center", TextAlignCenter], ["right", TextAlignRight]] as const).map(([a, Icon]) => (
            <button key={a} type="button" role="radio" aria-checked={look.align === a} aria-label={`Align ${a}`} onClick={() => onBox({ align: a })} className={cn("flex size-7 items-center justify-center rounded-full", look.align === a ? "bg-accent text-bg" : "text-text-muted")}><Icon className="size-3.5" /></button>
          ))}
        </div>
      </Row>
      <Row label="Wrap width"><Step value={wrapWidthOf(box, t)} min={200} max={cw} step={20} unit="px" onChange={(v) => onBox({ wrap: { rule: "greedy_whitespace", width: v } })} /></Row>
      <Row label="Colour">
        <div role="radiogroup" aria-label="Colour" className="inline-flex gap-1.5">
          {COLOURS.map((c) => <button key={c} type="button" role="radio" aria-label={c} aria-checked={look.fill.toUpperCase() === c} onClick={() => onBox({ fill: c })} className={cn("size-6 rounded-full border-2", look.fill.toUpperCase() === c ? "border-accent" : "border-border")} style={{ background: c }} />)}
        </div>
      </Row>
      <label className="flex flex-col gap-1 text-xs text-text-muted">Sample text
        <textarea value={copy[box.role] ?? ""} onChange={(e) => onCopy(box.role, e.target.value)} rows={2} className="rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none" />
      </label>
      <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 self-start text-xs text-text-muted hover:text-danger"><Trash className="size-3.5" />Remove text box</button>
    </section>
  );
}

/** The library at the foot of the panel: name and count, Change, set chips, thumbnails that drag onto a slide. */
function LibraryPane({ libraries, libraryId, onLibrary, selected, slide, onPin }: { libraries: Library[]; libraryId: string | null; onLibrary: (id: string | null) => void; selected: Selection | null; slide: Template["slides"][number] | null; onPin: PanelProps["onPin"] }) {
  const library = libraries.find((l) => l.id === libraryId) ?? null;
  const [changing, setChanging] = useState(false);
  // The set chip belongs to one library; another library starts on All.
  const [chip, setChip] = useState<{ id: string | null; set: string | null }>({ id: libraryId, set: null });
  const set = chip.id === libraryId ? chip.set : null;
  const setSet = (next: string | null) => setChip({ id: libraryId, set: next });
  const { images, loading, error, reload } = useLibraryImages(libraryId);
  const [adding, setAdding] = useState<{ done: number; failed: number; left: number } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  // A page of thumbnails at a time (2026-10-09): 120 originals at once was
  // part of what took production down. More on request; the chip resets it.
  const PAGE = 60;
  const [pages, setPages] = useState<{ key: string; n: number }>({ key: "", n: 1 });
  const sets = library?.sets.filter((s) => !s.parentId) ?? [];
  const shown = (images ?? []).filter((i) => i.status === "active" && (!set || i.setName === set));
  const pageKey = `${libraryId}:${set ?? ""}`;
  const limit = (pages.key === pageKey ? pages.n : 1) * PAGE;
  const targetCell = selected && slide && !selected.box ? (selected.cell ?? 0) : null;

  const addPictures = async (files: FileList | null) => {
    if (!files || !libraryId) return;
    const list = [...files].slice(0, 40);
    let done = 0;
    let failed = 0;
    setAdding({ done, failed, left: list.length });
    for (const file of list) {
      const res = await uploadPicture(libraryId, file);
      if (res.error) failed++;
      else done++;
      setAdding({ done, failed, left: list.length - done - failed });
    }
    await reload();
  };

  return (
    <section className="flex flex-col gap-2 p-4" aria-label="Library">
      <div className="flex items-center gap-3">
        <span className="size-10 shrink-0 rounded-[8px] border border-border bg-card-sunken bg-cover bg-center" style={library?.cover ? { backgroundImage: `url("${thumbUrl(library.cover, 120)}")` } : undefined} aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col"><b className="truncate text-sm">{library?.name ?? "No library"}</b><span className="text-xs text-text-muted tnum">{library ? `${library.count} images` : "Pick one to render"}</span></span>
        <button type="button" onClick={() => setChanging((c) => !c)} className="text-xs text-text-muted hover:text-text-primary">Change</button>
      </div>
      {changing && (
        <div role="listbox" aria-label="Image library" className="flex flex-col rounded-nested border border-border p-1">
          {libraries.map((l) => (
            <button key={l.id} type="button" role="option" aria-selected={libraryId === l.id} onClick={() => { onLibrary(libraryId === l.id ? null : l.id); setChanging(false); }} className={cn("flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-sm hover:bg-card-raised", libraryId === l.id && "bg-card-raised")}>
              <span className="size-6 shrink-0 rounded-[4px] bg-card-sunken bg-cover bg-center" style={l.cover ? { backgroundImage: `url("${thumbUrl(l.cover, 80)}")` } : undefined} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{l.name}</span><span className="text-xs text-text-muted tnum">{l.count}</span>
              {libraryId === l.id && <Check className="size-3.5 text-accent" />}
            </button>
          ))}
        </div>
      )}
      {library && (
        <>
          <div className="no-scrollbar flex gap-1 overflow-x-auto" role="radiogroup" aria-label="Set">
            <Chip on={!set} onClick={() => setSet(null)}>All <b className="ml-1">{library.count}</b></Chip>
            {sets.map((s) => <Chip key={s.id} on={set === s.name} onClick={() => setSet(s.name)}>{s.name} <b className="ml-1">{s.count}</b></Chip>)}
          </div>
          {loading && !images ? <p className="flex items-center gap-1.5 text-xs text-text-muted"><Loader2 className="size-3.5 animate-spin" />Loading pictures</p> : error ? <p role="alert" className="text-xs text-danger">{error}</p> : shown.length === 0 ? <p className="text-xs text-text-muted">No pictures{set ? " in this set" : ""}.</p> : (
            <div className="grid grid-cols-3 gap-1.5" aria-label="Pictures">
              {shown.slice(0, limit).map((img) => (
                <button
                  key={img.id}
                  type="button"
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData(IMAGE_DRAG, JSON.stringify({ url: img.url, image_id: img.id })); e.dataTransfer.effectAllowed = "copy"; }}
                  onClick={() => { if (targetCell !== null && selected) onPin(selected.slide, targetCell, { url: img.url, image_id: img.id }); }}
                  title={targetCell !== null ? `Pin to slide ${slide!.n}` : "Drag onto a slide to pin it there"}
                  aria-label={img.setName ? `${img.setName} picture` : "Picture"}
                  className="relative aspect-square cursor-grab overflow-hidden rounded-[6px] border border-border bg-card-sunken hover:border-accent active:cursor-grabbing"
                >
                  <LazyPicture src={img.url} width={240} className="absolute inset-0 block" />
                </button>
              ))}
            </div>
          )}
          {shown.length > limit && (
            <div className="flex items-center gap-2 text-[11px] text-text-muted tnum">
              <span>Showing {limit} of {shown.length}.</span>
              <button type="button" onClick={() => setPages({ key: pageKey, n: (pages.key === pageKey ? pages.n : 1) + 1 })} className="underline hover:text-text-primary">Show {Math.min(PAGE, shown.length - limit)} more</button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple hidden onChange={(e) => { void addPictures(e.target.files); e.target.value = ""; }} />
            <Btn onClick={() => picker.current?.click()} disabled={library.readOnly || Boolean(adding?.left)} title={library.readOnly ? "This library is read-only" : undefined}><Upload className="size-3.5" />Upload images</Btn>
            <Btn disabled title="Not connected yet"><Sparkles className="size-3.5" />Generate with AI</Btn>
            {adding && <span role="status" className="text-xs text-text-muted tnum">{adding.left > 0 ? `Adding, ${adding.left} to go` : `${adding.done} added`}{adding.failed > 0 ? `, ${adding.failed} failed` : ""}</span>}
          </div>
        </>
      )}
    </section>
  );
}

/** The library's pictures, read once per library and again after an upload. */
async function fetchImages(id: string): Promise<{ images: LibraryImage[] | null; error: string | null }> {
  try {
    const res = await fetch(`/api/carousel-generator/libraries/${id}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as { library?: LibraryDetail; error?: string } | null;
    if (!res.ok || !json?.library) return { images: null, error: json?.error ?? "The pictures could not be loaded" };
    return { images: json.library.images, error: null };
  } catch {
    return { images: null, error: "The pictures could not be loaded" };
  }
}

function useLibraryImages(libraryId: string | null) {
  const [state, setState] = useState<{ id: string | null; images: LibraryImage[] | null; error: string | null }>({ id: null, images: null, error: null });
  useEffect(() => {
    if (!libraryId) return;
    let live = true;
    void fetchImages(libraryId).then((r) => { if (live) setState({ id: libraryId, ...r }); });
    return () => { live = false; };
  }, [libraryId]);
  const reload = useCallback(async () => {
    if (!libraryId) return;
    const r = await fetchImages(libraryId);
    setState({ id: libraryId, ...r });
  }, [libraryId]);
  const current = Boolean(libraryId) && state.id === libraryId;
  return { images: current ? state.images : null, loading: Boolean(libraryId) && !current, error: current ? state.error : null, reload };
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex min-h-7 items-center justify-between gap-2 text-xs text-text-muted"><span>{label}</span><span className="flex items-center">{children}</span></div>;
}

export function Step({ value, min, max, step = 1, unit, disabled, onChange }: { value: number; min: number; max: number; step?: number; unit?: string; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <span className={cn("inline-flex items-stretch overflow-hidden rounded-nested border border-border bg-bg/60", disabled && "opacity-40")}>
      <button type="button" aria-label="Decrease" disabled={disabled} onClick={() => onChange(Math.max(min, value - step))} className="flex w-6 items-center justify-center text-text-muted hover:text-text-primary"><Minus className="size-3" /></button>
      <span className="flex min-w-12 items-center justify-center border-x border-border px-1 text-xs text-text-primary tnum">{value}{unit && <small className="ml-0.5 text-text-muted">{unit}</small>}</span>
      <button type="button" aria-label="Increase" disabled={disabled} onClick={() => onChange(Math.min(max, value + step))} className="flex w-6 items-center justify-center text-text-muted hover:text-text-primary"><Plus className="size-3" /></button>
    </span>
  );
}

function Select({ value, onChange, ariaLabel, children }: { value: string; onChange: (v: string) => void; ariaLabel: string; children: React.ReactNode }) {
  return (
    <span className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} className="w-44 appearance-none truncate rounded-nested border border-border bg-bg/60 py-1.5 pr-7 pl-3 text-xs text-text-primary outline-none">{children}</select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 text-text-muted" />
    </span>
  );
}

function Seg({ value, options, onChange, ariaLabel }: { value: string; options: [string, string][]; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-full bg-card-raised p-0.5">
      {options.map(([v, label]) => <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", value === v ? "bg-accent text-bg" : "text-text-muted")}>{label}</button>)}
    </div>
  );
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn("relative h-5 w-9 rounded-full transition-colors", on ? "bg-accent" : "bg-card-raised border border-border")}>
      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left]", on ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="radio" aria-checked={on} onClick={onClick} className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] whitespace-nowrap tnum", on ? "border-text-primary bg-text-primary text-bg" : "border-border text-text-muted hover:text-text-primary")}>{children}</button>;
}

/** Reads an image drag from the library; null for any other drag. */
export function readImageDrag(dt: DataTransfer): { url: string; image_id?: string } | null {
  const raw = dt.getData(IMAGE_DRAG);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { url?: unknown; image_id?: unknown };
    if (typeof v.url !== "string" || !/^https?:\/\//.test(v.url)) return null;
    return { url: v.url, ...(typeof v.image_id === "string" ? { image_id: v.image_id } : {}) };
  } catch {
    return null;
  }
}
