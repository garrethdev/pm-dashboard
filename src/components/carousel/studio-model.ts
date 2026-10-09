/**
 * The Studio's view of a template (pm.carousel-template/1) and the pure
 * changes the inspector makes to it: a box's font, weight, stroke, shadow,
 * alignment, a free position after a drag, a picture pinned to one slide's
 * cell, the slide size. Nothing here touches the network or React, so it
 * can be tested on its own.
 */
import { DEFAULT_FONT_KEY, SLIDE_FONTS, fontByFamily, fontByKey, fontEntry, nearestWeight, type SlideFont } from "@/lib/carousel/fonts";

export type Anchor = { kind: string; at?: number; y?: number; margin?: number; x?: number; top?: number; right?: number };
export type Stroke = { width: number; color: string } | null;
export type Shadow = { kind: "hard" | "soft"; dx: number; dy: number; blur: number; color: string; opacity: number; stroked: false } | null;
export type Box = {
  role: string;
  style: string;
  size: number;
  anchor: Anchor;
  purpose?: string;
  align?: string;
  wrap?: { rule: string; width?: number };
  fill?: string;
  font?: string;
  weight?: number;
  stroke?: Stroke;
  shadow?: Shadow;
};
export type Cell = { x: number; y: number; w: number; h: number };
export type Pinned = { cell: number; url: string; image_id?: string };
export type Slide = { n: number; layout: "single" | "quad" | "quiz"; cells: Cell[]; images: { rule: string; pools?: string[]; pinned?: Pinned[] }; text: Box[]; rendered?: boolean };
export type Contract = { role: string; writer: "ai" | "fixed" | "per_batch"; fixed?: string; max_chars?: number; columns?: string[]; painted?: boolean };
export type TextStyle = { font?: string; fill?: string; align?: string; wrap?: { rule?: string; width?: number }; stroke?: Stroke; shadow?: Shadow; weight?: number };
export type FontRef = { family: string; weight: number; file: string };
export type Template = Record<string, unknown> & {
  canvas: { width: number; height: number; background: string | null };
  slides: Slide[];
  copy_contract: Contract[];
  name: string;
  character: string;
  text_styles: Record<string, TextStyle>;
  fonts: Record<string, FontRef>;
};
/** What is selected on the canvas: a slide, and on it a text box or an image cell. */
export type Selection = { slide: number; box: string | null; cell: number | null };
export type StudioSize = "4:5" | "9:16";

export const SIZES: Record<StudioSize, { width: number; height: number }> = { "4:5": { width: 1080, height: 1350 }, "9:16": { width: 1080, height: 1920 } };
export const WEIGHT_NAMES: Record<number, string> = { 100: "Thin", 200: "Extra light", 300: "Light", 400: "Regular", 500: "Medium", 600: "Semi bold", 700: "Bold", 800: "Extra bold", 900: "Black" };
export const COLOURS = ["#FFFFFF", "#000000", "#FFF949", "#22D3EE", "#FF5A5F"];

export function renumber(slides: Slide[]): Slide[] {
  return slides.map((s, i) => ({ ...s, n: i + 1 }));
}

export function sizeOf(t: Template): StudioSize {
  return t.canvas.height > 1500 ? "9:16" : "4:5";
}

export function wrapWidthOf(box: Box, t: Template): number {
  return box.wrap?.width ?? t.text_styles[box.style]?.wrap?.width ?? Math.round(t.canvas.width * 0.88);
}

/** How many characters fit in three lines at this size and wrap width. */
export function fitsChars(box: Box, t: Template): number {
  const perLine = Math.floor(wrapWidthOf(box, t) / (box.size * 0.56));
  return perLine * 3;
}

/** The font a box paints with: its own, else its style's, else the default. */
export function fontOf(box: Box, t: Template): { key: string; font: SlideFont; family: string; weight: number } {
  const key = box.font ?? t.text_styles[box.style]?.font ?? "caption";
  const entry = t.fonts?.[key];
  const font = SLIDE_FONTS.find((f) => f.key === key) ?? fontByFamily(entry?.family) ?? fontByKey(DEFAULT_FONT_KEY);
  return { key, font, family: entry?.family ?? font.family, weight: box.weight ?? t.text_styles[box.style]?.weight ?? entry?.weight ?? 700 };
}

/** The look of a box after its own values override the shared style. */
export function lookOf(box: Box, t: Template): { fill: string; align: "left" | "center" | "right"; stroke: Stroke; shadow: Shadow } {
  const style = t.text_styles[box.style] ?? {};
  const align = box.align ?? style.align ?? "center";
  return {
    fill: box.fill ?? style.fill ?? "#FFFFFF",
    align: align === "left" || align === "right" ? align : "center",
    stroke: box.stroke === undefined ? (style.stroke ?? null) : box.stroke,
    shadow: box.shadow === undefined ? (style.shadow ?? null) : box.shadow,
  };
}

/** Where the box's centre sits, as ratios of the canvas, for the on-screen preview and as the start of a drag. */
export function centreOf(box: Box, t: Template): { x: number; y: number } {
  const a = box.anchor;
  if (a.kind === "free") return { x: a.x ?? 0.5, y: a.y ?? 0.5 };
  if (a.kind === "block_centre_y") return { x: 0.5, y: a.at ?? 0.5 };
  if (a.kind === "top") return { x: 0.5, y: Math.min(0.95, (a.y ?? 0) / t.canvas.height + 0.06) };
  if (a.kind === "bottom") return { x: 0.5, y: Math.max(0.05, 1 - (a.margin ?? 0) / t.canvas.height - 0.06) };
  if (a.kind === "stack_right") return { x: 1 - (a.right ?? 0) / t.canvas.width - wrapWidthOf(box, t) / t.canvas.width / 2, y: Math.min(0.95, (a.top ?? 0) / t.canvas.height + 0.06) };
  return { x: 0.5, y: 0.5 };
}

/** The template with this font in its `fonts` map, so a box may name it. */
export function withFont(t: Template, key: string): Template {
  if (t.fonts?.[key]) return t;
  return { ...t, fonts: { ...(t.fonts ?? {}), [key]: fontEntry(key) } };
}

/** The weights a font has, and the one nearest to what is asked. */
export function weightFor(key: string, wanted: number): number {
  return nearestWeight(fontByKey(key), wanted);
}

/** A box patch applied on one slide; the font entry is added when the patch names one. */
export function patchBox(t: Template, slide: number, role: string, patch: Partial<Box>): Template {
  const base = patch.font ? withFont(t, patch.font) : t;
  return { ...base, slides: base.slides.map((s, k) => (k === slide ? { ...s, text: s.text.map((b) => (b.role === role ? { ...b, ...patch } : b)) } : s)) };
}

/** The same deck at the other slide size: the width stays, cells and image rows stretch. */
export function resized(t: Template, size: StudioSize): Template {
  const next = SIZES[size];
  const ratio = next.height / t.canvas.height;
  if (ratio === 1 && t.canvas.width === next.width) return t;
  return {
    ...t,
    canvas: { ...t.canvas, width: next.width, height: next.height },
    slides: t.slides.map((s) => ({ ...s, cells: s.cells.map((c) => ({ x: c.x, w: c.w, y: Math.round(c.y * ratio), h: Math.round(c.h * ratio) })) })),
  };
}

/** One picture on one slide's cell (Garreth, 2026-10-08: "just that one slide, not every deck"). */
export function pinned(t: Template, slide: number, cell: number, pin: { url: string; image_id?: string } | null): Template {
  return {
    ...t,
    slides: t.slides.map((s, k) => {
      if (k !== slide) return s;
      const rest = (s.images.pinned ?? []).filter((p) => p.cell !== cell);
      const list = pin ? [...rest, { cell, url: pin.url, ...(pin.image_id ? { image_id: pin.image_id } : {}) }].sort((a, b) => a.cell - b.cell) : rest;
      const images = { ...s.images };
      if (list.length) images.pinned = list;
      else delete images.pinned;
      return { ...s, images };
    }),
  };
}

export function pinOf(s: Slide, cell: number): Pinned | null {
  return s.images.pinned?.find((p) => p.cell === cell) ?? null;
}

/** A text box moved by a drag lands as a free anchor at the point it was dropped. */
export function movedTo(x: number, y: number): Anchor {
  return { kind: "free", x: Math.round(Math.min(1, Math.max(0, x)) * 1000) / 1000, y: Math.round(Math.min(1, Math.max(0, y)) * 1000) / 1000 };
}

export function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

/** The text box's CSS for the on-screen preview, the same look the painter gives it. */
export function cssOf(box: Box, t: Template, zoom: number): { fontFamily: string; fontWeight: number; color: string; textAlign: "left" | "center" | "right"; WebkitTextStroke?: string; paintOrder?: string; textShadow?: string; fontSize: number } {
  const f = fontOf(box, t);
  const look = lookOf(box, t);
  const css: ReturnType<typeof cssOf> = { fontFamily: `"${f.family}", sans-serif`, fontWeight: f.weight, color: look.fill, textAlign: look.align, fontSize: Math.max(6, box.size * zoom) };
  // The stroke sits under the fill, as the painter draws it, so the letters stay solid.
  if (look.stroke && look.stroke.width > 0) { css.WebkitTextStroke = `${Math.max(0.5, look.stroke.width * zoom)}px ${look.stroke.color}`; css.paintOrder = "stroke fill"; }
  if (look.shadow) css.textShadow = `${look.shadow.dx * zoom}px ${look.shadow.dy * zoom}px ${look.shadow.kind === "hard" ? 0 : look.shadow.blur * zoom}px rgba(0,0,0,${look.shadow.opacity})`;
  return css;
}

/** A zoom that shows a whole slide in the canvas, with room for its label and the strips. */
export function fitZoom(canvasHeight: number, stageHeight: number): number {
  return Math.min(1, Math.max(0.1, Math.floor(((stageHeight - 170) / canvasHeight) * 100) / 100));
}
