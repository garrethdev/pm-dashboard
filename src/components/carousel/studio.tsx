"use client";

/**
 * The Studio (D6 approved 2026-09-15 with round three 2026-09-17; D11 and
 * D14 approved 2026-09-22; Garreth's round two of 2026-10-08). Four ways
 * in: a saved reference deck, an idea, from scratch, or Figma (not yet);
 * the library first. Then the canvas with every slide in a row, panned by
 * dragging the background or with the hand tool, zoomed from the strip
 * below; a text box selected by a click and moved by a drag to wherever it
 * is dropped; a picture dragged from the library onto one slide's cell and
 * pinned there, for that slide only. Adjustments at the left, the
 * conversation at the right, both of which fold away. Slides can be added,
 * duplicated, moved and deleted, with undo. Save as carousel type, or Save
 * version in edit mode; Discard draft is a hold.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Accent, Pill, SlideFace, post } from "@/components/carousel/kit";
import { HoldButton } from "@/components/ui/hold-button";
import { ChevronDown, ChevronLeft, Cursor, DotsThree, Hand, ImageIcon, Images, Loader2, Minus, Pencil, Play, Plus, RotateCw, SidebarSimple, SlidersHorizontal, TextT, Undo, X } from "@/components/ui/icons";
import { thumbUrl } from "@/lib/carousel/thumb";
import { cn } from "@/lib/utils";
import type { Library, TemplateRecord } from "@/server/carousel/repo/types";
import { Adjustments, readImageDrag } from "@/components/carousel/studio-panel";
import { FigmaStep, IdeaStep, LibraryStep, ReferenceGrid, StartScreen, type Way } from "@/components/carousel/studio-start";
import { centreOf, cssOf, fitZoom, movedTo, patchBox, pinOf, pinned, renumber, resized, sizeOf, slugOf, wrapWidthOf, type Box, type Contract, type Selection, type Slide, type StudioSize, type Template } from "@/components/carousel/studio-model";

type Msg = { who: "me" | "ai"; text: string; busy?: boolean; err?: boolean; /** What to send again when the call failed; absent for a failed draft. */ retry?: string };
type Stage = "start" | "reference" | "library" | "idea" | "figma" | "studio";
type Drag = { slide: number; role: string; x: number; y: number; startX: number; startY: number; fromX: number; fromY: number; moved: boolean };

const CHARACTERS = ["Character 2", "Character 3", "Character 4", "Character 5", "Character 6"];

export function Studio({ libraries: given, referenceId: givenReference, editing, writing, sample: initialSample }: { libraries: Library[]; referenceId: number | null; editing?: TemplateRecord; writing?: string | null; sample?: Record<string, string> | null }) {
  const router = useRouter();
  const editingTemplate = (editing?.template as Template | null) ?? null;
  const [stage, setStage] = useState<Stage>(editing ? "studio" : givenReference ? "library" : "start");
  const [way, setWay] = useState<Way>(givenReference ? "reference" : "idea");
  const [referenceId, setReferenceId] = useState<number | null>(givenReference);
  const [libraryId, setLibraryId] = useState<string | null>(editing?.libraryId ?? null);
  const [size, setSize] = useState<StudioSize>(editingTemplate ? sizeOf(editingTemplate) : "4:5");
  const [template, setTemplate] = useState<Template | null>(editingTemplate);
  const [copy, setCopy] = useState<Record<string, string>>(initialSample ?? (editingTemplate?.sample_copy as Record<string, string> | undefined) ?? {});
  const [history, setHistory] = useState<{ template: Template; copy: Record<string, string> }[]>([]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [zoom, setZoom] = useState(0.22);
  const [tool, setTool] = useState<"select" | "hand">("select");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [menu, setMenu] = useState<number | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: editing?.name ?? "", character: editing?.character ?? "Character 3", slug: editing?.slug ?? "" });
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [name, setName] = useState(editing?.name ?? "New carousel type");
  const [renaming, setRenaming] = useState(false);
  const [refStrip, setRefStrip] = useState<{ handle: string | null; slides: { media: string | null; copy: string | null }[]; analysed: boolean } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<{ slide: number; cell: number } | null>(null);
  const panRef = useRef<HTMLDivElement | null>(null);
  const panning = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  // The first deck on the canvas is shown whole; after that the zoom is the person's.
  const fitted = useRef(false);
  const fitOnce = (el: HTMLDivElement | null, t: Template | null) => {
    if (!el || !t || fitted.current) return;
    fitted.current = true;
    setZoom(fitZoom(t.canvas.height, el.clientHeight));
  };
  // Libraries made here, on the library step, join the ones the page came with.
  const [made, setMade] = useState<Library[]>([]);
  const libraries = useMemo(() => [...given.map((g) => made.find((m) => m.id === g.id) ?? g), ...made.filter((m) => !given.some((g) => g.id === m.id))], [given, made]);
  const library = libraries.find((l) => l.id === libraryId) ?? null;

  const push = useCallback((next: Template, nextCopy?: Record<string, string>) => {
    setHistory((h) => (template ? [...h.slice(-40), { template, copy }] : h));
    setTemplate(next);
    if (nextCopy) setCopy(nextCopy);
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
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey && !typing) { e.preventDefault(); undo(); }
      if (e.key === "Escape" && !typing) { setSelected(null); setMenu(null); setTool("select"); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [undo]);

  const say = (m: Msg) => setMsgs((x) => [...x.filter((y) => !y.busy), m]);

  const took = (t: Template, sample: Record<string, string> | undefined) => {
    setTemplate(t);
    setCopy(sample ?? {});
    setName(t.name);
    setSaveForm((f) => ({ ...f, name: t.name, slug: slugOf(t.name) }));
    setHistory([]);
    setPreviews({});
    setSelected(null);
    setDirty(true);
    fitOnce(panRef.current, t);
  };

  // The library can be skipped here and picked on the canvas before saving (Garreth, 2026-09-29).
  const draft = async (idea: string | null, lib: string | null = libraryId, ref: number | null = referenceId) => {
    setBusy("draft");
    setStage("studio");
    setMsgs((m) => [...m, ...(idea ? [{ who: "me" as const, text: idea }] : []), { who: "ai" as const, text: ref && !idea ? "Analysing the reference" : "Drafting", busy: true }]);
    const res = await post<{ template: Template; sample: Record<string, string>; reference?: { handle: string | null; slides: { media: string | null; copy: string | null }[]; analysed: boolean } }>("/api/carousel-generator/studio/draft", { idea, referenceId: idea ? null : ref, libraryId: lib, size, character: saveForm.character });
    setBusy(null);
    if (res.error || !res.data) {
      say({ who: "ai", text: res.error ?? "The draft failed", err: true });
      return;
    }
    took(res.data.template, res.data.sample);
    if (res.data.reference) setRefStrip(res.data.reference);
    say({ who: "ai", text: `Drafted ${res.data.template.slides.length} slides${res.data.template.slides.some((s) => s.images.pools?.length) ? ", each drawing from a set of the library" : ""}. Click a text box to change it, drag it to move it, or tell me what to change.` });
  };
  /** Start from scratch: five plain slides, no model call. */
  const scratch = async (lib: string | null = libraryId) => {
    setBusy("draft");
    setStage("studio");
    const res = await post<{ template: Template; sample: Record<string, string> }>("/api/carousel-generator/studio/draft", { scratch: true, slides: 5, libraryId: lib, size, character: saveForm.character });
    setBusy(null);
    if (res.error || !res.data) { say({ who: "ai", text: res.error ?? "The deck could not be started", err: true }); return; }
    took(res.data.template, res.data.sample);
    say({ who: "ai", text: "Five plain slides. Click a text box to change it, drag it to move it, add slides from the end, or pin pictures from the library." });
  };

  /** Start from a Figma link (D11): the file becomes the deck; the instructions, if any, then go to the writer. */
  const importFigma = async (url: string, prompt: string) => {
    setBusy("draft");
    setStage("studio");
    setMsgs((m) => [...m, ...(prompt ? [{ who: "me" as const, text: prompt }] : []), { who: "ai" as const, text: "Reading the Figma file", busy: true }]);
    const res = await post<{ template: Template; sample: Record<string, string>; notes: string[]; file: { name: string; frames: number; samples: number } }>("/api/carousel-generator/studio/figma", { url, libraryId, character: saveForm.character });
    setBusy(null);
    if (res.error || !res.data) { say({ who: "ai", text: res.error ?? "The Figma file could not be read", err: true }); return; }
    took(res.data.template, res.data.sample);
    setSize(sizeOf(res.data.template));
    say({ who: "ai", text: [`${res.data.file.frames} slides from ${res.data.file.name}${res.data.file.samples > 1 ? `, read across ${res.data.file.samples} samples` : ""}.`, ...res.data.notes].join(" ") });
    if (prompt) await reviseWith(prompt, res.data.template, res.data.sample);
  };

  const leaveLibrary = (lib: string | null) => {
    if (way === "scratch") return void scratch(lib);
    if (way === "figma") return setStage("figma");
    if (way === "reference" && referenceId) return void draft(null, lib);
    setStage("idea");
  };
  // Switching library drops any slide's set the new library does not have.
  const chooseLibrary = (id: string | null) => {
    setLibraryId(id);
    setPreviews({});
    setDirty(true);
    if (!template) return;
    const names = new Set(libraries.find((l) => l.id === id)?.sets.filter((s) => !s.parentId).map((s) => s.name) ?? []);
    setTemplate({ ...template, slides: template.slides.map((s) => (s.images.pools?.some((p) => !names.has(p)) ? { ...s, images: { ...s.images, pools: undefined } } : s)) });
  };
  const changeSize = (s: StudioSize) => {
    setSize(s);
    if (template) { push(resized(template, s)); setPreviews({}); }
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

  /**
   * The conversation changes the template (slides, layouts, sets, text
   * boxes, sample lines, the direction). What comes back lands on the canvas
   * as one step, so Ctrl or Cmd+Z takes it back. Nothing is saved.
   */
  const revise = (text: string) => (template ? reviseWith(text, template, copy) : Promise.resolve());
  const reviseWith = async (text: string, t: Template, c: Record<string, string>) => {
    const past = msgs.filter((m) => !m.busy && !m.err).map((m) => ({ who: m.who, text: m.text }));
    setMsgs((x) => [...x.filter((m) => !(m.err && m.retry === text) && !(m.who === "me" && m.text === text)), { who: "me", text }, { who: "ai", text: "Thinking", busy: true }]);
    setBusy("chat");
    const res = await post<{ reply: string; template: Template | null; copy: Record<string, string> | null }>("/api/carousel-generator/studio/revise", { message: text, template: t, copy: c, libraryId, history: past });
    setBusy(null);
    if (res.error || !res.data) {
      say({ who: "ai", text: res.error ?? "The writer could not be reached", err: true, retry: text });
      return;
    }
    if (res.data.template) {
      setHistory((h) => [...h.slice(-40), { template: t, copy: c }]);
      setTemplate(res.data.template);
      setCopy(res.data.copy ?? c);
      setDirty(true);
      setPreviews({});
      setSelected(null);
    }
    say({ who: "ai", text: res.data.reply });
  };
  const send = () => {
    const text = input.trim();
    if (!text || busy === "chat" || busy === "draft") return;
    setInput("");
    if (!template) { void draft(text); return; }
    void revise(text);
  };

  // Slide operations (D6 round three).
  const addAfter = (i: number) => {
    if (!template) return;
    const src = template.slides[i] ?? template.slides[template.slides.length - 1];
    const fresh: Slide = { ...structuredClone(src), rendered: false, images: { ...src.images, pinned: undefined }, text: src.text.map((b) => ({ ...b, role: `${b.role.replace(/_\d+$/, "")}_${template.slides.length + 1}` })) };
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
    setSelected(null);
    say({ who: "ai", text: `Deleted slide ${i + 1}. Ctrl or Cmd+Z brings it back.` });
  };
  const addBox = () => {
    if (!template) return;
    const at = selected?.slide ?? 0;
    const slide = template.slides[at];
    const n = slide.text.filter((b) => /^text_box_\d+$/.test(b.role)).length + 1;
    const role = `text_box_${n}`;
    const box: Box = { role, style: Object.keys(template.text_styles)[0] ?? "caption", size: 48, anchor: { kind: "block_centre_y", at: 0.75 } };
    const slides = template.slides.map((s, k) => (k === at ? { ...s, text: [...s.text, box] } : s));
    push({ ...template, slides, copy_contract: [...template.copy_contract, { role, writer: "ai", max_chars: 120, columns: [role] }] }, { ...copy, [role]: "Text Box" });
    setSelected({ slide: at, box: role, cell: null });
  };
  const removeBox = (role: string) => {
    if (!template || !selected) return;
    const slides = template.slides.map((s, k) => (k === selected.slide ? { ...s, text: s.text.filter((b) => b.role !== role) } : s));
    const nextCopy = { ...copy };
    delete nextCopy[role];
    push({ ...template, slides, copy_contract: template.copy_contract.filter((c) => c.role !== role) }, nextCopy);
    setSelected({ slide: selected.slide, box: null, cell: null });
  };
  const updateBox = (patch: Partial<Box>) => {
    if (!template || !selected?.box) return;
    push(patchBox(template, selected.slide, selected.box, patch));
    setPreviews((p) => (Object.keys(p).length ? {} : p));
  };
  const layer = (role: string, dir: -1 | 1) => {
    if (!template || !selected) return;
    const text = [...template.slides[selected.slide].text];
    const i = text.findIndex((b) => b.role === role);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= text.length) return;
    [text[i], text[j]] = [text[j], text[i]];
    push({ ...template, slides: template.slides.map((s, k) => (k === selected.slide ? { ...s, text } : s)) });
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
  const setPool = (slide: number, set: string | null) => {
    if (!template) return;
    push({ ...template, slides: template.slides.map((s, k) => (k === slide ? { ...s, images: { ...s.images, pools: set ? [set] : undefined } } : s)) });
    setPreviews({});
  };
  /** A picture pinned to one slide's cell, or unpinned. */
  const pin = (slide: number, cell: number, p: { url: string; image_id?: string } | null) => {
    if (!template) return;
    push(pinned(template, slide, cell, p));
    setPreviews({});
    setSelected({ slide, box: null, cell });
  };

  // Dragging a text box: a press on the box, a move past a few pixels, a drop that lands as a free anchor.
  const startDrag = (e: React.PointerEvent, i: number, b: Box) => {
    if (!template || tool !== "select" || e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const from = centreOf(b, template);
    setDrag({ slide: i, role: b.role, x: from.x, y: from.y, fromX: from.x, fromY: from.y, startX: e.clientX, startY: e.clientY, moved: false });
  };
  const moveDrag = (e: React.PointerEvent) => {
    if (!drag || !template) return;
    const dx = (e.clientX - drag.startX) / (template.canvas.width * zoom);
    const dy = (e.clientY - drag.startY) / (template.canvas.height * zoom);
    const moved = drag.moved || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 4;
    setDrag({ ...drag, x: Math.min(1, Math.max(0, drag.fromX + dx)), y: Math.min(1, Math.max(0, drag.fromY + dy)), moved });
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!drag || !template) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (drag.moved) { push(patchBox(template, drag.slide, drag.role, { anchor: movedTo(drag.x, drag.y) })); setPreviews({}); }
    setSelected({ slide: drag.slide, box: drag.role, cell: null });
    setDrag(null);
  };

  // A picture dropped anywhere on a slide pins to the cell under the pointer, text boxes included.
  const cellAt = (e: React.DragEvent, s: Slide): number => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * cw;
    const y = ((e.clientY - r.top) / r.height) * ch;
    const k = s.cells.findIndex((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
    return k < 0 ? 0 : k;
  };
  const dragOverSlide = (e: React.DragEvent, i: number, s: Slide) => {
    if (!e.dataTransfer.types.includes("application/x-carousel-image")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const k = cellAt(e, s);
    if (over?.slide !== i || over.cell !== k) setOver({ slide: i, cell: k });
  };
  const dropOnSlide = (e: React.DragEvent, i: number, s: Slide) => {
    const img = readImageDrag(e.dataTransfer);
    setOver(null);
    if (!img) return;
    e.preventDefault();
    pin(i, cellAt(e, s), img);
  };

  // Panning: drag the dotted background in any direction (or anything, with the hand tool).
  const startPan = (e: React.PointerEvent) => {
    const el = panRef.current;
    if (!el || e.button !== 0) return;
    const onSlide = (e.target as HTMLElement).closest("[data-slide]");
    if (onSlide && tool !== "hand") return;
    panning.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(e.pointerId);
  };
  const movePan = (e: React.PointerEvent) => {
    const p = panning.current;
    const el = panRef.current;
    if (!p || !el) return;
    el.scrollLeft = p.left - (e.clientX - p.x);
    el.scrollTop = p.top - (e.clientY - p.y);
  };
  const endPan = (e: React.PointerEvent) => {
    if (!panning.current) return;
    panning.current = null;
    panRef.current?.releasePointerCapture?.(e.pointerId);
  };

  const save = async () => {
    if (!template) return;
    setSaveErr(null);
    setBusy("save");
    const body = { ...template, name: saveForm.name || name, character: saveForm.character, library_id: libraryId, sample_copy: copy };
    if (editing) {
      const res = await post<{ version: number }>(`/api/carousel-generator/templates/${editing.id}`, { template: body });
      setBusy(null);
      if (res.error) { setSaveErr(res.error); say({ who: "ai", text: res.error, err: true }); return; }
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
    else { setTemplate(null); setCopy({}); setHistory([]); setMsgs([]); setStage("start"); setDirty(false); setName("New carousel type"); setRefStrip(null); setReferenceId(givenReference); setSelected(null); }
  };

  // ── Screens before the canvas ──
  if (stage === "start") return <StartScreen name={name} onBack={() => router.push("/carousel-generator/types")} onPick={(w) => { setWay(w); setStage(w === "reference" && !referenceId ? "reference" : "library"); }} />;
  if (stage === "reference") return <ReferenceGrid name={name} onBack={() => setStage("start")} onPick={(id) => { setReferenceId(id); setStage("library"); }} />;
  if (stage === "library") {
    return (
      <LibraryStep
        name={name}
        libraries={libraries}
        libraryId={libraryId}
        size={size}
        onSize={setSize}
        onBack={() => setStage(way === "reference" && !givenReference ? "reference" : "start")}
        onPick={setLibraryId}
        onMade={(lib) => setMade((m) => [...m.filter((x) => x.id !== lib.id), lib])}
        onContinue={() => leaveLibrary(libraryId)}
        onSkip={() => { setLibraryId(null); leaveLibrary(null); }}
        continueLabel={way === "scratch" ? "Open the canvas" : way === "reference" ? "Draft from the reference" : way === "figma" ? "Paste the link" : "Continue"}
      />
    );
  }
  if (stage === "idea") return <IdeaStep name={name} onBack={() => setStage("library")} value={input} onChange={setInput} onSend={send} />;
  if (stage === "figma") return <FigmaStep name={name} onBack={() => setStage("library")} onImport={(url, prompt) => void importFigma(url, prompt)} />;

  // ── The canvas ──
  const t = template;
  const cw = t?.canvas.width ?? 1080;
  const ch = t?.canvas.height ?? 1350;
  const slideW = Math.round(cw * zoom);
  const slideH = Math.round(ch * zoom);
  const cols = `${leftOpen ? "300px" : "44px"} minmax(0,1fr) ${rightOpen ? "300px" : "0px"}`;

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
          <span className="hidden items-center gap-2 sm:flex">
            {editing && <Pill>{editing.character}</Pill>}
            {editing && <Pill className="tnum">Version {editing.activeVersion ?? editing.versions[0]?.version ?? 1}</Pill>}
            {library && <Pill>{library.name}</Pill>}
          </span>
          {dirty && <Pill>Not saved</Pill>}
        </div>
        {/* On a phone the two actions take a row of their own under the title. */}
        <span className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          <HoldButton onConfirm={discard} tone="warn" className="bg-transparent border border-border text-text-muted">{editing ? "Discard changes" : "Discard draft"}</HoldButton>
          <Accent disabled={!t || !libraryId} busy={busy === "save"} onClick={() => (editing ? void save() : setSaveOpen(true))}>{editing ? "Save version" : "Save as carousel type"}</Accent>
        </span>
      </div>

      <div className="grid min-h-[600px] flex-1 gap-3 lg:flex-none lg:h-[calc(100dvh-7.5rem)] lg:min-h-[520px] lg:grid-cols-[var(--studio-cols)] lg:grid-rows-[minmax(0,1fr)]" style={{ "--studio-cols": cols } as React.CSSProperties}>
        {leftOpen ? (
          <Adjustments
            t={t}
            size={size}
            onSize={changeSize}
            selected={selected}
            onSelect={setSelected}
            copy={copy}
            onCopy={(role, text) => setCopy((c) => ({ ...c, [role]: text }))}
            onBox={updateBox}
            onRename={renameBox}
            onWriter={setWriter}
            onAddBox={addBox}
            onRemoveBox={removeBox}
            onLayer={layer}
            onPool={setPool}
            onPin={pin}
            libraries={libraries}
            libraryId={libraryId}
            onLibrary={chooseLibrary}
            onFold={() => setLeftOpen(false)}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card py-3" aria-label="Adjustments, folded">
            <button type="button" onClick={() => setLeftOpen(true)} aria-label="Show adjustments" className="text-text-muted hover:text-text-primary"><SidebarSimple className="size-4" /></button>
            <button type="button" onClick={() => setLeftOpen(true)} aria-label="Adjustments" title="Adjustments" className="text-text-muted hover:text-text-primary"><SlidersHorizontal className="size-4" /></button>
            <button type="button" onClick={() => setLeftOpen(true)} aria-label="Library" title="Library" className="text-text-muted hover:text-text-primary"><Images className="size-4" /></button>
          </div>
        )}

        <div className="relative flex min-h-0 flex-col overflow-hidden rounded-card border border-border bg-card-sunken [background-image:radial-gradient(var(--border)_1px,transparent_1.2px)] [background-size:18px_18px]">
          <div className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-border glass-overlay px-2 py-1">
            {busy === "draft" ? <span className="inline-flex items-center gap-1.5 px-2 text-xs text-text-muted"><Loader2 className="size-3.5 animate-spin" />{way === "scratch" ? "Setting up" : way === "figma" ? "Reading the Figma file" : "Drafting"}</span> : (
              <>
                <span className="hidden px-2 text-xs text-text-muted tnum sm:inline">{selected ? `Slide ${selected.slide + 1} of ${t?.slides.length ?? 0}` : `${t?.slides.length ?? 0} slides`}</span>
                <Tool onClick={renderPreview} busy={busy === "render"} disabled={!t || !libraryId} title={!libraryId ? "Pick a library first" : undefined}><Play className="size-3.5" />Render preview</Tool>
                <Tool onClick={regenSample} busy={busy === "sample"} disabled={!t}><RotateCw className="size-3.5" />Regenerate sample</Tool>
              </>
            )}
          </div>
          {!rightOpen && <button type="button" onClick={() => setRightOpen(true)} aria-label="Show conversation" className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full border border-border glass-overlay text-text-muted hover:text-text-primary"><SidebarSimple className="size-4 -scale-x-100" /></button>}

          <div
            ref={(el) => { panRef.current = el; fitOnce(el, t); }}
            className={cn("no-scrollbar flex min-h-0 flex-1 items-start gap-6 overflow-auto px-8 pt-16 pr-[50vw] pb-[60vh]", tool === "hand" ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            onClick={(e) => { if (e.target === e.currentTarget) { setSelected(null); setMenu(null); } }}
          >
            {refStrip && (
              <div className="flex shrink-0 flex-col gap-2 rounded-nested border border-dashed border-border p-3">
                <span className="text-xs text-text-muted">Reference{refStrip.handle ? ` · @${refStrip.handle}` : ""}{!refStrip.analysed && <Pill className="ml-2">Not analysed in Trends</Pill>}</span>
                <div className="flex gap-2">{refStrip.slides.map((s, i) => <span key={i} className="block rounded-[6px] border border-border bg-card bg-cover bg-center" style={{ width: Math.round(slideW * 0.45), height: Math.round(slideH * 0.45), backgroundImage: s.media ? `url("${s.media}")` : undefined }} aria-hidden />)}</div>
              </div>
            )}
            {t?.slides.map((s, i) => (
              <div key={i} className="group flex shrink-0 flex-col gap-2" data-slide={s.n}>
                <div className="flex h-6 items-center gap-2 text-xs text-text-muted">
                  <b className="tnum">Slide {s.n}</b>
                  {s.rendered && <Pill tone="ok">Rendered</Pill>}
                  {s.images.pinned?.length ? <Pill tone="accent">Pinned</Pill> : null}
                  <span className="relative ml-auto">
                    <button type="button" aria-label={`Slide ${s.n} menu`} aria-haspopup="menu" aria-expanded={menu === i} onClick={() => setMenu(menu === i ? null : i)} className={cn("flex size-6 items-center justify-center rounded-full hover:bg-card-raised", menu === i || selected?.slide === i ? "opacity-100" : "opacity-0 group-hover:opacity-100")}><DotsThree className="size-4" /></button>
                    {menu === i && (
                      <div role="menu" className="absolute top-full right-0 z-20 mt-1 flex min-w-40 flex-col rounded-nested border border-border glass-overlay p-1 text-sm text-text-primary">
                        <button type="button" role="menuitem" onClick={() => { duplicate(i); setMenu(null); }} className="rounded-[10px] px-2 py-1.5 text-left hover:bg-card">Duplicate</button>
                        <button type="button" role="menuitem" onClick={() => { addAfter(i); setMenu(null); }} className="rounded-[10px] px-2 py-1.5 text-left hover:bg-card">Add slide after</button>
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
                  onClick={() => { if (tool === "select") setSelected((cur) => (cur?.slide === i && cur.box === null && cur.cell !== null ? cur : { slide: i, box: null, cell: null })); }}
                  onKeyDown={(e) => { if (e.key === "Enter") setSelected({ slide: i, box: null, cell: null }); }}
                  // A slide is a picture, not a panel: it stays dark in both
                  // themes so white slide copy reads the way it will be painted.
                  onDragOver={(e) => dragOverSlide(e, i, s)}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null) && over?.slide === i) setOver(null); }}
                  onDrop={(e) => dropOnSlide(e, i, s)}
                  className={cn("relative overflow-hidden rounded-[10px] border", selected?.slide === i ? "border-accent" : "border-border")}
                  style={{ width: slideW, height: slideH, background: t.canvas.background ?? "#111113" }}
                >
                  {previews[s.n] ? (
                    <SlideFace svg={previews[s.n]} className="absolute inset-0" />
                  ) : (
                    <div className="absolute inset-0">
                      {s.cells.map((c, k) => {
                        const p = pinOf(s, k);
                        const hot = over?.slide === i && over.cell === k;
                        const on = selected?.slide === i && selected.cell === k && !selected.box;
                        return (
                          <div
                            key={k}
                            role="button"
                            tabIndex={-1}
                            aria-label={`Slide ${s.n} image ${k + 1}${p ? ", pinned" : ""}`}
                            onClick={(e) => { e.stopPropagation(); if (tool === "select") setSelected({ slide: i, box: null, cell: k }); }}
                            className={cn("absolute flex items-end justify-start bg-cover bg-center text-[10px] text-white/60", hot ? "ring-2 ring-accent ring-inset" : on ? "ring-1 ring-accent/70 ring-inset" : "", !p && "bg-white/5")}
                            style={{ left: `${(c.x / cw) * 100}%`, top: `${(c.y / ch) * 100}%`, width: `${(c.w / cw) * 100}%`, height: `${(c.h / ch) * 100}%`, backgroundImage: p ? `url("${thumbUrl(p.url, 720)}")` : undefined }}
                          >
                            <span className={cn("m-1 rounded-full px-1.5 py-0.5", p ? "bg-black/60 text-white" : "bg-transparent")}>{p ? "Pinned" : hot ? "Drop to pin" : (s.images.pools?.[0] ?? "library")}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {s.text.map((b) => {
                    const on = selected?.slide === i && selected.box === b.role;
                    const dragging = drag && drag.slide === i && drag.role === b.role ? drag : null;
                    const pos = dragging ? { x: dragging.x, y: dragging.y } : centreOf(b, t);
                    const width = (wrapWidthOf(b, t) / cw) * 100;
                    return (
                      <button
                        key={b.role}
                        type="button"
                        onPointerDown={(e) => startDrag(e, i, b)}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={() => setDrag(null)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === "Enter") setSelected({ slide: i, box: b.role, cell: null }); }}
                        aria-label={b.role}
                        aria-pressed={on}
                        className={cn("absolute -translate-x-1/2 -translate-y-1/2 touch-none rounded-sm border px-0.5 break-words select-none", dragging?.moved ? "cursor-grabbing border-accent border-dashed" : on ? "cursor-grab border-accent" : "cursor-grab border-transparent hover:border-text-muted/40")}
                        style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, width: `${width}%`, lineHeight: 1.15, opacity: previews[s.n] ? 0 : 1, ...cssOf(b, t, zoom) }}
                      >
                        {copy[b.role] ?? b.role}
                        {selected?.slide === i && <span className={cn("absolute -top-4 left-0 rounded-full px-1.5 text-[9px] font-medium", on ? "bg-accent text-bg" : "bg-black/70 text-white")} style={{ fontFamily: "inherit", WebkitTextStroke: 0, textShadow: "none" }}>{b.role}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {t && (
              <div className="flex shrink-0 flex-col gap-2" data-slide="add">
                <div className="h-6" />
                <button type="button" onClick={() => addAfter(t.slides.length - 1)} aria-label="Add slide" className="flex flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-border text-xs text-text-muted hover:text-text-primary" style={{ width: slideW, height: slideH }}><Plus className="size-5" />Add slide</button>
              </div>
            )}
          </div>

          <div role="toolbar" aria-label="Tools" className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border glass-overlay px-2 py-1">
            <button type="button" onClick={() => setTool("select")} aria-label="Select" aria-pressed={tool === "select"} title="Select (Esc)" className={cn("flex size-7 items-center justify-center rounded-full", tool === "select" ? "bg-text-primary text-bg" : "text-text-muted hover:text-text-primary")}><Cursor className="size-3.5" /></button>
            <button type="button" onClick={() => setTool("hand")} aria-label="Pan" aria-pressed={tool === "hand"} title="Pan: drag anywhere to move the canvas" className={cn("flex size-7 items-center justify-center rounded-full", tool === "hand" ? "bg-text-primary text-bg" : "text-text-muted hover:text-text-primary")}><Hand className="size-3.5" /></button>
            <button type="button" onClick={addBox} disabled={!t} aria-label="Text box" title="Add a text box to the selected slide" className="flex size-7 items-center justify-center rounded-full text-text-muted hover:text-text-primary disabled:opacity-40"><TextT className="size-3.5" /></button>
            <button type="button" onClick={() => setLeftOpen(true)} disabled={!t} aria-label="Pictures" title="Open the library to pin a picture" className="flex size-7 items-center justify-center rounded-full text-text-muted hover:text-text-primary disabled:opacity-40"><ImageIcon className="size-3.5" /></button>
            <span className="mx-1 h-4 border-l border-border" />
            <button type="button" onClick={() => setZoom((z) => Math.max(0.08, Math.round((z - 0.04) * 100) / 100))} aria-label="Zoom out" className="flex size-7 items-center justify-center rounded-full text-text-muted hover:text-text-primary"><Minus className="size-3" /></button>
            <span className="w-10 text-center text-xs text-text-muted tnum">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(1, Math.round((z + 0.04) * 100) / 100))} aria-label="Zoom in" className="flex size-7 items-center justify-center rounded-full text-text-muted hover:text-text-primary"><Plus className="size-3" /></button>
            <span className="mx-1 h-4 border-l border-border" />
            <button type="button" onClick={undo} disabled={!history.length} aria-label="Undo" title="Undo (Ctrl or Cmd+Z)" className="flex size-7 items-center justify-center rounded-full text-text-muted hover:text-text-primary disabled:opacity-40"><Undo className="size-3.5" /></button>
          </div>
        </div>

        {rightOpen && (
          <aside className="flex min-h-0 flex-col rounded-card border border-border bg-card" aria-label="Conversation">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-[11px] font-medium tracking-[0.12em] text-text-muted uppercase">Conversation</span>
              <button type="button" onClick={() => setRightOpen(false)} aria-label="Hide conversation" className="text-text-muted hover:text-text-primary"><SidebarSimple className="size-4 -scale-x-100" /></button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 text-sm" aria-live="polite">
              {msgs.length === 0 && <p className="text-xs text-text-muted">Tell me what to change, or “make it eight slides”.</p>}
              {msgs.map((m, i) => (
                <div key={i} className={cn("flex", m.who === "me" ? "justify-end" : "justify-start")}>
                  <span className={cn("max-w-[90%] rounded-nested px-3 py-2", m.who === "me" ? "bg-card-raised" : m.err ? "border border-danger/40 text-danger" : "border border-border text-text-muted")}>
                    {m.busy && <Loader2 className="mr-1.5 inline size-3.5 animate-spin" />}{m.text}
                    {m.err && (m.retry || way !== "figma") && <button type="button" onClick={() => (m.retry ? void revise(m.retry) : way === "scratch" ? void scratch() : void draft(msgs.find((x) => x.who === "me")?.text ?? null))} className="ml-2 underline">Retry</button>}
                    {m.err && !m.retry && way === "figma" && <button type="button" onClick={() => { setMsgs([]); setStage("figma"); }} className="ml-2 underline">Back to the link</button>}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-border p-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Message" aria-label="Message" className="w-full rounded-full border border-border bg-card-raised px-3.5 py-1.5 text-sm outline-none placeholder:text-text-muted" />
              <button type="button" onClick={send} disabled={!input.trim()} aria-label="Send" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-text-primary text-bg disabled:opacity-30"><Play className="size-3.5" /></button>
            </div>
          </aside>
        )}
      </div>

      {saveOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div aria-hidden onClick={() => setSaveOpen(false)} className="absolute inset-0 bg-[var(--scrim)]" />
          <form role="dialog" aria-label="Save as carousel type" onSubmit={(e) => { e.preventDefault(); void save(); }} className="relative flex w-full max-w-sm flex-col gap-3 rounded-card border border-border bg-card p-5">
            <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Save as carousel type</h2><button type="button" onClick={() => setSaveOpen(false)} aria-label="Close" className="text-text-muted"><X className="size-4" /></button></div>
            <label className="flex flex-col gap-1 text-xs text-text-muted">Name<input value={saveForm.name} onChange={(e) => setSaveForm((f) => ({ ...f, name: e.target.value }))} className="rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none" /></label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">Character
              <span className="relative"><select value={saveForm.character} onChange={(e) => setSaveForm((f) => ({ ...f, character: e.target.value }))} className="w-full appearance-none rounded-nested border border-border bg-bg/60 px-3 py-1.5 text-sm text-text-primary outline-none">{(CHARACTERS.includes(saveForm.character) ? CHARACTERS : [saveForm.character, ...CHARACTERS]).map((c) => <option key={c}>{c}</option>)}</select><ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2" /></span>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">Short name
              <span className={cn("flex items-center rounded-nested border bg-bg/60 px-3", saveErr === "Taken" ? "border-danger" : "border-border")}>
                <input value={saveForm.slug} onChange={(e) => { setSaveErr(null); setSaveForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-") })); }} className="w-full bg-transparent py-1.5 text-sm text-text-primary outline-none" />
                {saveErr === "Taken" && <span role="alert" className="text-xs text-danger">Taken</span>}
              </span>
            </label>
            {saveErr && saveErr !== "Taken" && <p role="alert" className="text-xs text-danger">{saveErr}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setSaveOpen(false)} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary">Cancel</button><Accent type="submit" disabled={!saveForm.name.trim() || !saveForm.slug.trim() || !libraryId} busy={busy === "save"}>Save</Accent></div>
          </form>
        </div>
      )}
    </div>
  );
}

/** A small strip button, for the top of the canvas. */
function Tool({ children, onClick, busy, disabled, title }: { children: React.ReactNode; onClick: () => void; busy?: boolean; disabled?: boolean; title?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy} title={title} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card-raised px-3 py-1 text-xs font-medium whitespace-nowrap text-text-muted hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40">
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}{children}
    </button>
  );
}
