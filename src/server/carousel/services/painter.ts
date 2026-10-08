/**
 * The painter's preview (DEV-04 and DEV-05, the part built here).
 *
 * Paints a deck's slides as SVG at the template's true canvas size: the
 * picked images in their cells, the copy in its boxes with the template's
 * fill, stroke, shadow, wrap width and anchor. The markup is stored on the
 * slide and drawn inline on the batch page, so a rendered deck can be seen
 * and judged.
 *
 * What is NOT here: rasterising to PNG or JPEG with the bundled font files
 * and uploading to the lane's bucket. That needs a native image library on
 * the server and is the step that writes a lane row, so until it lands a
 * rendered deck stays inside the generator's own tables and nothing reaches
 * the scheduler. The changelog says so.
 */
import { pickImages, type ImageAsset, type PickingTemplate } from "@/lib/carousel/picking/pick";

interface Style {
  fill?: string;
  weight?: number;
  stroke?: { width: number; color: string } | null;
  shadow?: { kind: string; dx: number; dy: number; blur: number; color: string; opacity: number } | null;
  line_height?: { px?: number; ratio?: number };
  wrap?: { rule: string; width?: number };
  align?: string;
  font?: string;
}

/**
 * A box carries the same fields a style does, and a box's own value wins:
 * the Studio writes font, fill, alignment, wrap width, stroke and shadow on
 * the box a person adjusted, and leaves the shared style alone.
 */
interface TextBox extends Style {
  role: string;
  style: string;
  size: number;
  anchor: { kind: string; y?: number; margin?: number; at?: number; right?: number; top?: number; x?: number };
  quote?: { when_hook_type?: string[]; open: string; close: string };
}

interface Slide {
  n: number;
  layout: string;
  cells: { x: number; y: number; w: number; h: number }[];
  images: PickingTemplate["slides"][number]["images"];
  text: TextBox[];
}

export interface PaintTemplate extends PickingTemplate {
  canvas: { width: number; height: number; background: string | null };
  text_styles: Record<string, Style>;
  fonts?: Record<string, { family?: string; weight?: number }>;
  slides: Slide[];
}

export interface PaintedSlide {
  position: number;
  imageUrls: string[];
  imageIds: string[];
  boxCopy: Record<string, string>;
  svg: string;
}

/**
 * Everything that is not text goes into the picture through one of these
 * two. A template is saved from the Studio and could carry anything in a
 * field the validator does not read; the painted slide is shown as raw
 * markup on the batch page, so a number is forced to be a number and a
 * name is cut down to letters, digits, dash and underscore (review item 9).
 */
const n = (v: unknown, fallback = 0): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};
const ident = (v: unknown): string => String(v ?? "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "x";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Greedy wrap by an estimated bold-sans advance; the real painter measures. */
export function wrapText(text: string, size: number, width: number): string[] {
  const perChar = size * 0.56;
  const max = Math.max(1, Math.floor(width / perChar));
  const out: string[] = [];
  for (const para of text.replace(/\r/g, "").split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > max && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

function textBlock(box: TextBox, shared: Style, text: string, canvas: { width: number; height: number }, fonts: Record<string, { family?: string; weight?: number }>): string {
  const style: Style = { ...shared, ...Object.fromEntries(Object.entries(box).filter(([k, v]) => ["fill", "weight", "stroke", "shadow", "line_height", "wrap", "align", "font"].includes(k) && v !== undefined)) };
  const stroke = style.stroke;
  const lh = style.line_height;
  const lineHeight = lh?.px ?? box.size * (lh?.ratio ?? 1.2);
  const wrapW = style.wrap?.rule === "greedy_whitespace" ? (style.wrap.width ?? canvas.width * 0.88) : canvas.width;
  const lines = style.wrap?.rule === "explicit_newlines" ? text.split("\n") : wrapText(text, box.size, wrapW);
  const blockH = lines.length * lineHeight;
  const a = box.anchor;
  let top: number;
  if (a.kind === "top") top = a.y ?? 0;
  else if (a.kind === "bottom") top = canvas.height - (a.margin ?? 0) - blockH;
  else if (a.kind === "stack_right") top = a.top ?? 0;
  else if (a.kind === "free") top = canvas.height * n(a.y, 0.5) - blockH / 2;
  else top = canvas.height * (a.at ?? 0.5) - blockH / 2;
  const align = style.align === "right" || a.kind === "stack_right" ? "end" : style.align === "left" ? "start" : "middle";
  // A free box is placed by its centre; its text lines up inside its own width.
  const centreX = a.kind === "free" ? canvas.width * n(a.x, 0.5) : canvas.width / 2;
  const x = a.kind === "stack_right" ? canvas.width - (a.right ?? 0) : align === "end" ? centreX + wrapW / 2 : align === "start" ? centreX - wrapW / 2 : centreX;
  const fontName = style.font && fonts[style.font]?.family ? fonts[style.font].family! : (Object.values(fonts)[0]?.family ?? "Inter");
  const fontFamily = `${fontName}, Inter, Arial, sans-serif`;
  const weight = n(style.weight, n(style.font && fonts[style.font]?.weight, 700));
  const shadow = style.shadow;
  const filter = shadow
    ? `<filter id="sh-${ident(box.role)}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="${n(shadow.dx)}" dy="${n(shadow.dy)}" stdDeviation="${n(shadow.blur) / 2}" flood-color="${esc(String(shadow.color))}" flood-opacity="${n(shadow.opacity, 1)}"/></filter>`
    : "";
  const tspans = lines
    .map((l, i) => `<tspan x="${n(x)}" y="${n(top + i * lineHeight + n(box.size) * 0.9).toFixed(1)}">${esc(l)}</tspan>`)
    .join("");
  const strokeAttr = stroke ? ` stroke="${esc(String(stroke.color))}" stroke-width="${n(stroke.width)}" stroke-linejoin="round" paint-order="stroke fill"` : "";
  return `${filter}<text font-family="${esc(fontFamily)}" font-weight="${weight}" font-size="${n(box.size, 48)}" fill="${esc(String(style.fill ?? "#fff"))}" text-anchor="${align}"${strokeAttr}${shadow ? ` filter="url(#sh-${ident(box.role)})"` : ""}>${tspans}</text>`;
}

export function paintDeck(template: PaintTemplate, assets: ImageAsset[], libraryId: string, deckId: string, copy: Record<string, string>): PaintedSlide[] {
  const manifest = pickImages(template, assets, libraryId, deckId);
  const fonts = (template.fonts ?? {}) as Record<string, { family?: string; weight?: number }>;
  return template.slides.map((slide) => {
    const picked = manifest.slides.find((s) => s.n === slide.n)?.cells ?? [];
    const cells = slide.cells
      .map((c, i) => {
        const img = picked[i];
        return img
          ? `<image href="${esc(img.public_url)}" x="${n(c.x)}" y="${n(c.y)}" width="${n(c.w)}" height="${n(c.h)}" preserveAspectRatio="xMidYMid slice"/>`
          : `<rect x="${n(c.x)}" y="${n(c.y)}" width="${n(c.w)}" height="${n(c.h)}" fill="#222"/>`;
      })
      .join("");
    const boxCopy: Record<string, string> = {};
    const texts = slide.text
      .map((box) => {
        let text = copy[box.role] ?? "";
        if (box.quote && copy.hook_type && box.quote.when_hook_type?.includes(copy.hook_type)) text = `${box.quote.open}${text}${box.quote.close}`;
        if (!text) return "";
        boxCopy[box.role] = text;
        return textBlock(box, template.text_styles[box.style] ?? {}, text, template.canvas, fonts);
      })
      .join("");
    const bg = template.canvas.background ? `<rect width="100%" height="100%" fill="${esc(String(template.canvas.background))}"/>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(template.canvas.width, 1080)} ${n(template.canvas.height, 1350)}" width="${n(template.canvas.width, 1080)}" height="${n(template.canvas.height, 1350)}">${bg}${cells}${texts}</svg>`;
    return { position: slide.n, imageUrls: picked.map((p) => p.public_url), imageIds: picked.map((p) => p.image_id), boxCopy, svg };
  });
}
