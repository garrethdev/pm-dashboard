"use client";

/**
 * The Studio (D6 approved 2026-09-15 with round three 2026-09-17; D11 and
 * D14 approved 2026-09-22). Two ways in: Start from a reference deck, or
 * Discuss your idea; the library first. Then the canvas with every slide in
 * a row, pan and zoom, a text box selected by a click, the inspector at the
 * left (Name, Written by, Fits, then font, size, alignment, wrap width), the
 * conversation at the right, the tool strip below, the top strip with the
 * slide count, Render preview and Regenerate sample. Slides can be added,
 * duplicated, moved and deleted, with undo. Save as carousel type, or Save
 * version in edit mode; Discard draft is a hold.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Accent, Btn, Pill, SlideFace, post } from "@/components/carousel/kit";
import { HoldButton } from "@/components/ui/hold-button";
import { Check, ChevronDown, ChevronLeft, DotsThree, Images, LayoutList, Loader2, Minus, Pencil, Play, Plus, RotateCw, Sparkles, Undo, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Library, TemplateRecord } from "@/server/carousel/repo/types";

type Box = { role: string; style: string; size: number; anchor: { kind: string; at?: number; y?: number; margin?: number }; purpose?: string; align?: string; wrap?: { rule: string; width?: number }; fill?: string };
type Slide = { n: number; layout: "single" | "quad" | "quiz"; cells: { x: number; y: number; w: number; h: number }[]; images: { rule: string; pools?: string[] }; text: Box[]; rendered?: boolean };
type Contract = { role: string; writer: "ai" | "fixed" | "per_batch"; fixed?: string; max_chars?: number; columns?: string[]; painted?: boolean };
type Template = Record<string, unknown> & { canvas: { width: number; height: number; background: string | null }; slides: Slide[]; copy_contract: Contract[]; name: string; character: string; text_styles: Record<string, { wrap?: { width?: number }; align?: string; fill?: string }> };

type Msg = { who: "me" | "ai"; text: string; busy?: boolean; err?: boolean };

function renumber(slides: Slide[]): Slide[] {
  return slides.map((s, i) => ({ ...s, n: i + 1 }));
}

function fitsChars(box: Box, t: Template): number {
  const width = box.wrap?.width ?? t.text_styles[box.style]?.wrap?.width ?? t.canvas.width * 0.88;
  const perLine = Math.floor(width / (box.size * 0.56));
  return perLine * 3;
}

export function Studio({ libraries, referenceId, editing, writing, sample: initialSample }: { libraries: Library[]; referenceId: number | null; editing?: TemplateRecord; writing?: string | null; sample?: Record<string, string> | null }) {
  const router = useRouter();
  const [stage, setStage] = useState<"start" | "library" | "idea" | "studio">(editing ? "studio" : referenceId ? "library" : "start");
  const [via, setVia] = useState<"idea" | "reference">(referenceId ? "reference" : "idea");
  const [libraryId, setLibraryId] = useState<string | null>(editing?.libraryId ?? null);
  const [size, setSize] = useState<"4:5" | "9:16">("4:5");
  const [template, setTemplate] = useState<Template | null>((editing?.template as Template | null) ?? null);
  const [copy, setCopy] = useState<Record<string, string>>(initialSample ?? ((editing?.template as Template | null)?.sample_copy as Record<string, string>) ?? {});
  const [history, setHistory] = useState<{ template: Template; copy: Record<string, string> }[]>([]);
  const [selected, setSelected] = useState<{ slide: number; box: string | null } | null>(null);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [zoom, setZoom] = useState(0.22);
  const [menu, setMenu] = useState<number | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: editing?.name ?? "", character: editing?.character ?? "Character 3", slug: editing?.slug ?? "" });
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [name, setName] = useState(editing?.name ?? "New carousel type");
  const [renaming, setRenaming] = useState(false);
  const [refStrip, setRefStrip] = useState<{ handle: string | null; slides: { media: string | null; copy: string | null }[]; analysed: boolean } | null>(null);
  const [dirty, setDirty] = useState(false);
  const panRef = useRef<HTMLDivElement>(null);
  const library = libraries.find((l) => l.id === libraryId) ?? null;
  const sets = useMemo(() => library?.sets.filter((s) => !s.parentId) ?? [], [library]);

  const push = useCallback((next: Template, nextCopy = copy) => {
    setHistory((h) => (template ? [...h.slice(-30), { template, copy }] : h));
    setTemplate(next);
    setCopy(nextCopy);
    setDirty(true);
  }, [template, copy]);
  const undo = useCallback(() => {
    setHistory((h) => {
      const last = h[h.length - 1];
      if (!last) return h;
      setTemplate(last.template);
      setCopy(last.copy);
      return h.slice(0, -1);
    });
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [undo]);

  const say = (m: Msg) => setMsgs((x) => [...x.filter((y) => !y.busy), m]);

  const draft = async (idea: string | null) => {
    if (!libraryId) return;
    setBusy("draft");
    setStage("studio");
    setMsgs((m) => [...m, ...(idea ? [{ who: "me" as const, text: idea }] : []), { who: "ai" as const, text: referenceId && !idea ? "Analysing the reference" : "Drafting", busy: true }]);
    const res = await post<{ template: Template; sample: Record<string, string>; reference?: { handle: string | null; slides: { media: string | null; copy: string | null }[]; analysed: boolean } }>("/api/carousel-generator/studio/draft", { idea, referenceId: idea ? null : referenceId, libraryId, size, character: saveForm.character });
    setBusy(null);
    if (res.error || !res.data) {
      say({ who: "ai", text: res.error ?? "The draft failed", err: true });
      return;
    }
    setTemplate(res.data.template);
    setCopy(res.data.sample ?? {});
    setName(res.data.template.name);
    setSaveForm((f) => ({ ...f, name: res.data!.template.name, slug: res.data!.template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) }));
    if (res.data.reference) setRefStrip(res.data.reference);
    setDirty(true);
    say({ who: "ai", text: `Drafted ${res.data.template.slides.length} slides${res.data.template.slides.some((s) => s.images.pools?.length) ? ", each drawing from a set of the library" : ""}. Click a text box to change it, or tell me what to change.` });
  };

  const regenSample = async () => {
    if (!template) return;
    setBusy("sample");
    const res = await post<{ copy: Record<string, string> }>("/api/carousel-generator/studio/sample", { template, writing: writing ?? null });
    setBusy(null);
    if (res.data) { setCopy(res.data.copy); setPreviews({}); say({ who: "ai", text: "New sample copy is on the canvas." }); }
    else say({ who: "ai", text: res.error ?? "The writer failed", err: true });
  };
  const renderPreview = async () => {
    if (!template || !libraryId) return;
    setBusy("render");
    const res = await post<{ slides: { position: number; svg: string }[] }>("/api/carousel-generator/studio/preview", { template, libraryId, copy });
    setBusy(null);
    if (res.data) setPreviews(Object.fromEntries(res.data.slides.map((s) => [s.position, s.svg])));
    else say({ who: "ai", text: res.error ?? "The preview failed", err: true });
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (!template) { void draft(text); return; }
    const m = text.match(/(\d+)\s*slides?/i);
    if (m) {
      const n = Math.max(2, Math.min(20, Number(m[1])));
      let slides = [...template.slides];
      while (slides.length < n) slides.push({ ...structuredClone(slides[slides.length - 1]), text: slides[slides.length - 1].text.map((b) => ({ ...b, role: `${b.role}_${slides.length + 1}` })) });
      slides = slides.slice(0, n);
      push({ ...template, slides: renumber(slides) });
      setMsgs((x) => [...x, { who: "me", text }, { who: "ai", text: `Made it ${n} slides.` }]);
      return;
    }
    setMsgs((x) => [...x, { who: "me", text }, { who: "ai", text: "Change it on the canvas: click a text box for its settings, use the three dots on a slide to duplicate, move or delete it, or press Regenerate sample for new words. The conversation edits the slide count for now." }]);
  };

  // Slide operations (D6 round three).
  const addAfter = (i: number) => {
    if (!template) return;
    const src = template.slides[i] ?? template.slides[template.slides.length - 1];
    const fresh: Slide = { ...structuredClone(src), rendered: false, text: src.text.map((b) => ({ ...b, role: `${b.role.replace(/_\d+$/, "")}_${template.slides.length + 1}` })) };
    const slides = [...template.slides];
    slides.splice(i + 1, 0, fresh);
    const contract = [...template.copy_contract, ...fresh.text.map((b) => ({ role: b.role, writer: "ai" as const, max_chars: 120, columns: [b.role] }))];
    push({ ...template, slides: renumber(slides), copy_contract: contract });
    say({ who: "ai", text: `Added slide ${i + 2} with slide ${i + 1}'s layout. Press Regenerate sample to write its line.` });
  };
  const duplicate = (i: number) => {
    if (!template) return;
    const src = template.slides[i];
    const fresh: Slide = { ...structuredClone(src), text: src.text.map((b) => ({ ...b, role: `${b.role.replace(/_\d+$/, "")}_${template.slides.length + 1}` })) };
    const slides = [...template.slides];
    slides.splice(i + 1, 0, fresh);
    const nextCopy = { ...copy };
    src.text.forEach((b, k) => { nextCopy[fresh.text[k].role] = copy[b.role] ?? ""; });
    push({ ...template, slides: renumber(slides), copy_contract: [...template.copy_contract, ...fresh.text.map((b) => ({ role: b.role, writer: "ai" as const, max_chars: 120, columns: [b.role] }))] }, nextCopy);
  };
  const move = (i: number, d: -1 | 1) => {
    if (!template) return;
    const slides = [...template.slides];
    const j = i + d;
    if (j < 0 || j >= slides.length) return;
    [slides[i], slides[j]] = [slides[j], slides[i]];
    push({ ...template, slides: renumber(slides) });
  };
  const remove = (i: number) => {
    if (!template || template.slides.length <= 2) return;
    const slides = template.slides.filter((_, k) => k !== i);
    push({ ...template, slides: renumber(slides) });
    say({ who: "ai", text: `Deleted slide ${i + 1}. Ctrl or Cmd+Z brings it back.` });
  };
  const addBox = () => {
    if (!template || !selected) return;
    const slide = template.slides[selected.slide];
    const n = slide.text.filter((b) => /^text_box_\d+$/.test(b.role)).length + 1;
    const role = `text_box_${n}`;
    const box: Box = { role, style: Object.keys(template.text_styles)[0] ?? "caption", size: 48, anchor: { kind: "block_centre_y", at: 0.75 } };
    const slides = template.slides.map((s, k) => (k === selected.slide ? { ...s, text: [...s.text, box] } : s));
    push({ ...template, slides, copy_contract: [...template.copy_contract, { role, writer: "ai", max_chars: 120, columns: [role] }] }, { ...copy, [role]: "Text Box" });
    setSelected({ slide: selected.slide, box: role });
  };
  const updateBox = (patch: Partial<Box>) => {
    if (!template || !selected?.box) return;
    const slides = template.slides.map((s, k) => (k === selected.slide ? { ...s, text: s.text.map((b) => (b.role === selected.box ? { ...b, ...patch } : b)) } : s));
    push({ ...template, slides });
  };
  const renameBox = (next: string) => {
    if (!template || !selected?.box) return;
    const role = next.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    if (!role || role === selected.box) return;
    if (template.slides[selected.slide].text.some((b) => b.role === role)) return;
    const slides = template.slides.map((s, k) => (k === selected.slide ? { ...s, text: s.text.map((b) => (b.role === selected.box ? { ...b, role } : b)) } : s));
    const contract = template.copy_contract.map((c) => (c.role === selected.box ? { ...c, role, columns: [role] } : c));
    const nextCopy = { ...copy, [role]: copy[selected.box] ?? "" };
    delete nextCopy[selected.box];
    push({ ...template, slides, copy_contract: contract }, nextCopy);
    setSelected({ ...selected, box: role });
  };
  const setWriter = (writer: Contract["writer"], fixed?: string) => {
    if (!template || !selected?.box) return;
    push({ ...template, copy_contract: template.copy_contract.map((c) => (c.role === selected.box ? { ...c, writer, fixed: writer === "ai" ? undefined : (fixed ?? c.fixed ?? copy[c.role] ?? "") } : c)) });
  };

  const save = async () => {
    if (!template) return;
    setSaveErr(null);
    setBusy("save");
    const body = { ...template, name: saveForm.name || name, character: saveForm.character, library_id: libraryId, sample_copy: copy };
    if (editing) {
      const res = await post<{ version: number }>(`/api/carousel-generator/templates/${editing.id}`, { template: body });
      setBusy(null);
      if (res.error) { setSaveErr(res.error); return; }
      setDirty(false);
      setSaveOpen(false);
      say({ who: "ai", text: `Saved version ${res.data?.version}. It is the active version now; a batch already running keeps the one it started with.` });
      router.refresh();
      return;
    }
    const res = await post<{ slug: string }>("/api/carousel-generator/templates", { name: saveForm.name || name, character: saveForm.character, slug: saveForm.slug, libraryId, template: body, sourceReferenceId: (template.source_reference_id as number | undefined) ?? null });
    setBusy(null);
    if (res.error) { setSaveErr(res.code === "TAKEN" ? "Taken" : res.error); return; }
    setDirty(false);
    router.push(`/carousel-generator/types/${res.data!.slug}`);
  };

  const discard = () => {
    if (editing) router.push(`/carousel-generator/types/${editing.slug}`);
    else { setTemplate(null); setCopy({}); setHistory([]); setMsgs([]); setStage("start"); setDirty(false); }
  };

  // ── Screens before the canvas ──
  if (stage === "start") {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <Head name={name} onBack={() => router.push("/carousel-generator/types")} />
        <div className="flex flex-1 items-center justify-center">
          <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <button type="button" onClick={() => { setVia("reference"); setStage("library"); }} className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-card border border-border bg-card p-8 text-center hover:border-text-muted/40"><span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><LayoutList className="size-5" /></span><b className="text-sm">Start from a reference deck</b></button>
            <button type="button" onClick={() => { setVia("idea"); setStage("library"); }} className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-card border border-border bg-card p-8 text-center hover:border-text-muted/40"><span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><Sparkles className="size-5" /></span><b className="text-sm">Discuss your idea</b></button>
            <button type="button" disabled title="Figma import is not connected yet" className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-card border border-border bg-card p-8 text-center opacity-50"><span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent"><Pencil className="size-5" /></span><b className="text-sm">Start from a Figma link</b></button>
          </div>
        </div>
      </div>
    );
  }
  if (stage === "library") {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <Head name={name} onBack={() => setStage("start")} />
        <div className="flex flex-1 items-start justify-center">
          <div role="listbox" aria-label="Image library" className="flex w-full max-w-md flex-col gap-1 rounded-card border border-border bg-card p-3">
            <div className="flex items-center justify-between px-2 py-1 text-sm font-medium"><span>Image library</span>
              <div role="radiogroup" aria-label="Slide size" className="inline-flex rounded-full bg-card-raised p-0.5">{(["4:5", "9:16"] as const).map((s) => <button key={s} type="button" role="radio" aria-checked={size === s} onClick={() => setSize(s)} className={cn("rounded-full px-3 py-1 text-xs font-medium tnum", size === s ? "bg-accent text-bg" : "text-text-muted")}>{s}</button>)}</div>
            </div>
            {libraries.map((l) => (
              <button key={l.id} type="button" role="option" aria-selected={libraryId === l.id} onClick={() => setLibraryId(l.id)} className={cn("flex items-center gap-3 rounded-nested px-2 py-2 text-left text-sm hover:bg-card-raised", libraryId === l.id && "bg-card-raised")}>
                <span className="size-9 shrink-0 rounded-[8px] border border-border bg-card-sunken bg-cover bg-center" style={l.cover ? { backgroundImage: `url("${l.cover}")` } : undefined} aria-hidden />
                <span className="flex min-w-0 flex-col"><span className="truncate">{l.name}</span><span className="text-xs text-text-muted tnum">{l.count} images</span></span>
                <span className="ml-auto">{libraryId === l.id && <Check className="size-4 text-accent" />}</span>
              </button>
            ))}
            <div className="mt-2 flex justify-end gap-2 border-t border-border pt-3">
              <Accent disabled={!libraryId} onClick={() => (via === "reference" && referenceId ? void draft(null) : setStage("idea"))}>Continue</Accent>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (stage === "idea") {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <Head name={name} onBack={() => setStage("library")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          {via === "reference" && !referenceId && <p className="text-sm text-text-muted">Pick a saved reference on Trends and press Copy to Studio, or describe the deck here.</p>}
          <div className="flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Sparkles className="size-4" /></span>
            <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Describe the carousel: who it is for, what it shows, how it ends" aria-label="Message" className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted" />
            <button type="button" onClick={send} disabled={!input.trim()} aria-label="Send" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-text-primary text-bg disabled:opacity-30"><Play className="size-3.5" /></button>
          </div>
        </div>
      </div>
    );
  }

  // ── The canvas ──
  const t = template;
  const sel = selected && t ? t.slides[selected.slide] : null;
  const selBox = sel && selected?.box ? sel.text.find((b) => b.role === selected.box) ?? null : null;
  const selContract = selBox ? t!.copy_contract.find((c) => c.role === selBox.role) : null;
  const cw = t?.canvas.width ?? 1080;
  const ch = t?.canvas.height ?? 1350;
  const slideW = Math.round(cw * zoom);
  const slideH = Math.round(ch * zoom);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => router.push(editing ? `/carousel-generator/types/${editing.slug}` : "/carousel-generator/types")} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"><ChevronLeft className="size-3.5" />{editing ? editing.name : "Carousel types"}</button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {renaming ? (
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setRenaming(false)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setRenaming(false); }} aria-label="Name" className="rounded-nested border border-border bg-bg/60 px-3 py-1 text-lg font-semibold outline-none" />
          ) : (
            <button type="button" onClick={() => setRenaming(true)} aria-label="Rename" className="inline-flex items-center gap-2 text-left"><h1 className="truncate text-xl font-semibold tracking-[-0.02em]">{name}</h1><Pencil className="size-3.5 text-text-muted" /></button>
          )}
          {editing && <Pill>{editing.character}</Pill>}
          {editing && <Pill className="tnum">Version {editing.activeVersion ?? editing.versions[0]?.version ?? 1}</Pill>}
          {library && <Pill>{library.name}</Pill>}
          {dirty && <Pill>Not saved</Pill>}
        </div>
        <HoldButton onConfirm={discard} tone="warn" className="bg-transparent border border-border text-text-muted">{editing ? "Discard changes" : "Discard draft"}</HoldButton>
        <Accent disabled={!t || !libraryId} busy={busy === "save"} onClick={() => (editing ? void save() : setSaveOpen(true))}>{editing ? "Save version" : "Save as carousel type"}</Accent>
      </div>

      <div className="grid min-h-[560px] flex-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="flex flex-col gap-3 overflow-y-auto rounded-card border border-border bg-card p-4" aria-label="Adjustments">
          <span className="text-sm font-medium text-text-muted">Adjustments</span>
          {selBox && t ? (
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2"><b className="truncate">{selBox.role}</b><Pill>Text box</Pill></div>
              <label className="flex flex-col gap-1 text-xs text-text-muted">Name
                <input defaultValue={selBox.role} key={selBox.role} onBlur={(e) => renameBox(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none" />
                {sel && sel.text.some((b) => b.role !== selBox.role && b.role === selBox.role) && <span role="alert" className="text-danger">Taken</span>}
              </label>
              <div className="flex flex-col gap-1 text-xs text-text-muted">Written by
                <div role="radiogroup" className="grid grid-cols-3 rounded-full bg-card-raised p-0.5">{(["ai", "fixed", "per_batch"] as const).map((w) => <button key={w} type="button" role="radio" aria-checked={(selContract?.writer ?? "ai") === w} onClick={() => setWriter(w)} className={cn("rounded-full px-2 py-1 text-xs font-medium", (selContract?.writer ?? "ai") === w ? "bg-accent text-bg" : "text-text-muted")}>{w === "ai" ? "AI" : w === "fixed" ? "Fixed" : "Per batch"}</button>)}</div>
                {selContract?.writer !== "ai" && <input value={selContract?.fixed ?? ""} onChange={(e) => setWriter(selContract!.writer, e.target.value)} placeholder="the words on every deck" className="rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none" />}
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted"><span>Fits</span><span className="tnum">{fitsChars(selBox, t)} characters</span></div>
              <Row label="Size"><Step value={selBox.size} min={20} max={120} onChange={(v) => updateBox({ size: v })} unit="px" /></Row>
              <Row label="Position"><Step value={Math.round((selBox.anchor.at ?? 0.5) * 100)} min={5} max={95} step={5} onChange={(v) => updateBox({ anchor: { kind: "block_centre_y", at: v / 100 } })} unit="%" /></Row>
              <Row label="Wrap width"><Step value={selBox.wrap?.width ?? t.text_styles[selBox.style]?.wrap?.width ?? Math.round(cw * 0.88)} min={200} max={cw} step={20} onChange={(v) => updateBox({ wrap: { rule: "greedy_whitespace", width: v } })} unit="px" /></Row>
              <Row label="Align"><div role="radiogroup" className="inline-flex rounded-full bg-card-raised p-0.5">{(["center", "right"] as const).map((a) => <button key={a} type="button" role="radio" aria-checked={(selBox.align ?? "center") === a} onClick={() => updateBox({ align: a })} className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", (selBox.align ?? "center") === a ? "bg-accent text-bg" : "text-text-muted")}>{a}</button>)}</div></Row>
              <Row label="Colour"><div role="radiogroup" className="inline-flex gap-1.5">{["#FFFFFF", "#000000", "#FFF949"].map((c) => <button key={c} type="button" role="radio" aria-label={c} aria-checked={(selBox.fill ?? "#FFFFFF") === c} onClick={() => updateBox({ fill: c })} className={cn("size-6 rounded-full border-2", (selBox.fill ?? "#FFFFFF") === c ? "border-accent" : "border-border")} style={{ background: c }} />)}</div></Row>
              <label className="flex flex-col gap-1 text-xs text-text-muted">Sample text
                <textarea value={copy[selBox.role] ?? ""} onChange={(e) => setCopy((c) => ({ ...c, [selBox.role]: e.target.value }))} rows={2} className="rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none" />
              </label>
            </div>
          ) : sel && t ? (
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2"><b>Slide {sel.n}</b><Pill className="capitalize">{sel.layout}</Pill></div>
              <Row label="Draws from">
                <select value={sel.images.pools?.[0] ?? ""} onChange={(e) => { const pools = e.target.value ? [e.target.value] : undefined; push({ ...t, slides: t.slides.map((s, k) => (k === selected!.slide ? { ...s, images: { ...s.images, pools } } : s)) }); }} className="rounded-nested border border-border bg-bg/60 px-2 py-1 text-xs text-text-primary">
                  <option value="">Whole library</option>
                  {sets.map((s) => <option key={s.id} value={s.name}>{s.name} · {s.count}</option>)}
                </select>
              </Row>
              {sets.length === 0 && <span className="text-xs text-text-muted">No images</span>}
              <Btn onClick={addBox}><Plus className="size-3" />Text box</Btn>
            </div>
          ) : (
            <p className="text-xs text-text-muted">Click a slide, then a text box.</p>
          )}
          <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
            <span className="flex items-center gap-2 text-xs text-text-muted"><Images className="size-3.5" />{library?.name ?? "No library"}</span>
            <div className="flex flex-wrap gap-1">{sets.map((s) => <Pill key={s.id} className="tnum">{s.name} <b className="ml-1 text-text-primary">{s.count}</b></Pill>)}</div>
          </div>
        </aside>

        <div className="relative flex min-h-0 flex-col overflow-hidden rounded-card border border-border bg-card-sunken [background-image:radial-gradient(var(--border)_1px,transparent_1.2px)] [background-size:18px_18px]">
          <div className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-border glass-overlay px-2 py-1">
            {busy === "draft" ? <span className="inline-flex items-center gap-1.5 px-2 text-xs text-text-muted"><Loader2 className="size-3.5 animate-spin" />Drafting</span> : (
              <>
                <span className="px-2 text-xs text-text-muted tnum">{selected ? `Slide ${selected.slide + 1} of ${t?.slides.length ?? 0}` : `${t?.slides.length ?? 0} slides`}</span>
                <Btn onClick={renderPreview} busy={busy === "render"} disabled={!t}><Play className="size-3.5" />Render preview</Btn>
                <Btn onClick={regenSample} busy={busy === "sample"} disabled={!t}><RotateCw className="size-3.5" />Regenerate sample</Btn>
              </>
            )}
          </div>
          <div ref={panRef} className="no-scrollbar flex flex-1 items-start gap-6 overflow-auto px-8 pt-16 pb-16" onClick={() => { setSelected(null); setMenu(null); }}>
            {refStrip && (
              <div className="flex shrink-0 flex-col gap-2 rounded-nested border border-dashed border-border p-3" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-text-muted">Reference{refStrip.handle ? ` · @${refStrip.handle}` : ""}{!refStrip.analysed && <Pill className="ml-2">Not analysed in Trends</Pill>}</span>
                <div className="flex gap-2">{refStrip.slides.map((s, i) => <span key={i} className="block rounded-[6px] border border-border bg-card bg-cover bg-center" style={{ width: Math.round(slideW * 0.45), height: Math.round(slideH * 0.45), backgroundImage: s.media ? `url("${s.media}")` : undefined }} aria-hidden />)}</div>
              </div>
            )}
            {t?.slides.map((s, i) => (
              <div key={i} className="group flex shrink-0 flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex h-6 items-center gap-2 text-xs text-text-muted">
                  <b className="tnum">Slide {s.n}</b>
                  {s.rendered && <Pill tone="ok">Rendered</Pill>}
                  <span className="relative ml-auto">
                    <button type="button" aria-label={`Slide ${s.n} menu`} aria-haspopup="menu" aria-expanded={menu === i} onClick={() => setMenu(menu === i ? null : i)} className={cn("flex size-6 items-center justify-center rounded-full hover:bg-card-raised", menu === i || selected?.slide === i ? "opacity-100" : "opacity-0 group-hover:opacity-100")}><DotsThree className="size-4" /></button>
                    {menu === i && (
                      <div role="menu" className="absolute top-full right-0 z-20 mt-1 flex min-w-40 flex-col rounded-nested border border-border glass-overlay p-1 text-sm text-text-primary">
                        <button type="button" role="menuitem" onClick={() => { duplicate(i); setMenu(null); }} className="rounded-[10px] px-2 py-1.5 text-left hover:bg-card">Duplicate</button>
                        <button type="button" role="menuitem" disabled={i === 0} onClick={() => { move(i, -1); setMenu(null); }} className="rounded-[10px] px-2 py-1.5 text-left hover:bg-card disabled:opacity-40">Move left</button>
                        <button type="button" role="menuitem" disabled={i === t.slides.length - 1} onClick={() => { move(i, 1); setMenu(null); }} className="rounded-[10px] px-2 py-1.5 text-left hover:bg-card disabled:opacity-40">Move right</button>
                        <div className="my-1 border-t border-border" />
                        <button type="button" role="menuitem" disabled={t.slides.length <= 2} onClick={() => { remove(i); setMenu(null); }} className="rounded-[10px] px-2 py-1.5 text-left text-danger hover:bg-card disabled:opacity-40">Delete</button>
                        {t.slides.length <= 2 && <span className="px-2 pb-1 text-[11px] text-text-muted">Keep at least two slides</span>}
                      </div>
                    )}
                  </span>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Slide ${s.n}`}
                  onClick={() => setSelected({ slide: i, box: null })}
                  onKeyDown={(e) => { if (e.key === "Enter") setSelected({ slide: i, box: null }); }}
                  // A slide is a picture, not a panel: it stays dark in both
                  // themes so white slide copy reads the way it will be painted.
                  className={cn("relative overflow-hidden rounded-[10px] border", selected?.slide === i ? "border-accent" : "border-border")}
                  style={{ width: slideW, height: slideH, background: t.canvas.background ?? "#111113" }}
                >
                  {previews[s.n] ? (
                    <SlideFace svg={previews[s.n]} className="absolute inset-0" />
                  ) : (
                    <div className={cn("absolute inset-0 grid gap-px", s.layout === "quad" ? "grid-cols-2 grid-rows-2" : "grid-cols-1")}>{s.cells.map((_, k) => <span key={k} className="flex items-center justify-center bg-white/5 text-[10px] text-white/50">{s.images.pools?.[0] ?? "library"}</span>)}</div>
                  )}
                  {s.text.map((b) => {
                    const on = selected?.slide === i && selected.box === b.role;
                    const width = ((b.wrap?.width ?? t.text_styles[b.style]?.wrap?.width ?? cw * 0.88) / cw) * 100;
                    return (
                      <button
                        key={b.role}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelected({ slide: i, box: b.role }); }}
                        aria-label={b.role}
                        aria-pressed={on}
                        className={cn("absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm border px-0.5 text-center font-bold break-words", on ? "border-accent" : "border-transparent hover:border-text-muted/40", b.align === "right" && "text-right")}
                        style={{ top: `${(b.anchor.at ?? 0.5) * 100}%`, width: `${width}%`, fontSize: Math.max(6, b.size * zoom), lineHeight: 1.15, color: b.fill ?? "#fff", textShadow: "0 1px 2px rgba(0,0,0,.8)", opacity: previews[s.n] ? 0 : 1 }}
                      >
                        {copy[b.role] ?? b.role}
                        {selected?.slide === i && <span className={cn("absolute -top-4 left-0 rounded-full px-1.5 text-[9px] font-medium", on ? "bg-accent text-bg" : "bg-black/70 text-white")}>{b.role}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {t && (
              <div className="flex shrink-0 flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="h-6" />
                <button type="button" onClick={() => addAfter(t.slides.length - 1)} aria-label="Add slide" className="flex flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-border text-xs text-text-muted hover:text-text-primary" style={{ width: slideW, height: slideH }}><Plus className="size-5" />Add slide</button>
              </div>
            )}
          </div>
          <div role="toolbar" aria-label="Tools" className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border glass-overlay px-2 py-1">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.1, z - 0.04))} aria-label="Zoom out" className="flex size-7 items-center justify-center rounded-full text-text-muted hover:text-text-primary"><Minus className="size-3" /></button>
            <span className="w-10 text-center text-xs text-text-muted tnum">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(1, z + 0.04))} aria-label="Zoom in" className="flex size-7 items-center justify-center rounded-full text-text-muted hover:text-text-primary"><Plus className="size-3" /></button>
            <span className="mx-1 h-4 border-l border-border" />
            <button type="button" onClick={addBox} disabled={!selected} aria-label="Text box" title="Text box" className="rounded-full px-2 py-1 text-xs font-medium text-text-muted hover:text-text-primary disabled:opacity-40">T</button>
            <button type="button" onClick={undo} disabled={!history.length} aria-label="Undo" title="Undo" className="flex size-7 items-center justify-center rounded-full text-text-muted hover:text-text-primary disabled:opacity-40"><Undo className="size-3.5" /></button>
          </div>
        </div>

        <aside className="flex min-h-0 flex-col rounded-card border border-border bg-card" aria-label="Conversation">
          <div className="border-b border-border px-4 py-3 text-sm font-medium text-text-muted">Conversation</div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 text-sm" aria-live="polite">
            {msgs.length === 0 && <p className="text-xs text-text-muted">Tell me what to change, or “make it eight slides”.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.who === "me" ? "justify-end" : "justify-start")}>
                <span className={cn("max-w-[90%] rounded-nested px-3 py-2", m.who === "me" ? "bg-card-raised" : m.err ? "border border-danger/40 text-danger" : "border border-border text-text-muted")}>
                  {m.busy && <Loader2 className="mr-1.5 inline size-3.5 animate-spin" />}{m.text}
                  {m.err && <button type="button" onClick={() => draft(msgs.find((x) => x.who === "me")?.text ?? null)} className="ml-2 underline">Retry</button>}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Message" aria-label="Message" className="w-full rounded-full border border-border bg-card-raised px-3.5 py-1.5 text-sm outline-none placeholder:text-text-muted" />
            <button type="button" onClick={send} disabled={!input.trim()} aria-label="Send" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-text-primary text-bg disabled:opacity-30"><Play className="size-3.5" /></button>
          </div>
        </aside>
      </div>

      {saveOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div aria-hidden onClick={() => setSaveOpen(false)} className="absolute inset-0 bg-[var(--scrim)]" />
          <form role="dialog" aria-label="Save as carousel type" onSubmit={(e) => { e.preventDefault(); void save(); }} className="relative flex w-full max-w-sm flex-col gap-3 rounded-card border border-border bg-card p-5">
            <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Save as carousel type</h2><button type="button" onClick={() => setSaveOpen(false)} aria-label="Close" className="text-text-muted"><X className="size-4" /></button></div>
            <label className="flex flex-col gap-1 text-xs text-text-muted">Name<input value={saveForm.name} onChange={(e) => setSaveForm((f) => ({ ...f, name: e.target.value }))} className="rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none" /></label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">Character
              <span className="relative"><select value={saveForm.character} onChange={(e) => setSaveForm((f) => ({ ...f, character: e.target.value }))} className="w-full appearance-none rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none">{["Character 2", "Character 3", "Character 4", "Character 5"].map((c) => <option key={c}>{c}</option>)}</select><ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2" /></span>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">Short name
              <span className={cn("flex items-center rounded-nested border bg-bg/60 px-3", saveErr === "Taken" ? "border-danger" : "border-border")}>
                <input value={saveForm.slug} onChange={(e) => { setSaveErr(null); setSaveForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-") })); }} className="w-full bg-transparent py-1.5 text-sm text-text-primary outline-none" />
                {saveErr === "Taken" && <span role="alert" className="text-xs text-danger">Taken</span>}
              </span>
            </label>
            {saveErr && saveErr !== "Taken" && <p role="alert" className="text-xs text-danger">{saveErr}</p>}
            <div className="flex justify-end gap-2"><Btn onClick={() => setSaveOpen(false)}>Cancel</Btn><Accent type="submit" disabled={!saveForm.name.trim() || !saveForm.slug.trim() || !libraryId} busy={busy === "save"}>Save</Accent></div>
          </form>
        </div>
      )}
    </div>
  );
}

function Head({ name, onBack }: { name: string; onBack: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"><ChevronLeft className="size-3.5" />Back</button>
      <h1 className="text-xl font-semibold tracking-[-0.02em]">{name}</h1>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2 text-xs text-text-muted"><span>{label}</span><span className="flex items-center">{children}</span></div>;
}

function Step({ value, min, max, step = 1, unit, onChange }: { value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-nested border border-border bg-bg/60">
      <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(min, value - step))} className="flex w-6 items-center justify-center text-text-muted hover:text-text-primary"><Minus className="size-3" /></button>
      <span className="flex min-w-14 items-center justify-center border-x border-border px-1 text-xs text-text-primary tnum">{value}{unit && <small className="ml-0.5 text-text-muted">{unit}</small>}</span>
      <button type="button" aria-label="Increase" onClick={() => onChange(Math.min(max, value + step))} className="flex w-6 items-center justify-center text-text-muted hover:text-text-primary"><Plus className="size-3" /></button>
    </span>
  );
}
