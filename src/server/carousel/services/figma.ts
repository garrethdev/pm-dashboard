/**
 * Start from a Figma link (D11-FigmaPrompt, FigmaReading, FigmaDraft,
 * FigmaNoAccess; Garreth's sample file of 2026-10-08, "3-Slide Journey
 * Carousel"). The file is read through Figma's REST API with the token in
 * FIGMA_TOKEN. What the file holds, as Garreth lays it out:
 *
 *   page → section "Sample 1" → frames "Slide 1", "Slide 2", "Slide 3"
 *        → section "Sample 2" → frames "Slide 4", "Slide 5", "Slide 6"
 *
 * A frame is a slide at the frame's size; a picture filling it is the
 * slide's image cell; a text layer is a text box with the layer's font,
 * size, weight, colour, alignment, stroke and shadow, placed where it sits
 * (a free anchor). With two or more samples, a text that reads the same in
 * every sample is fixed, and a picture that is the same in every sample is
 * copied into our storage and pinned to that slide; anything that varies is
 * for the writer and the library. Frames straight on the page, with no
 * section, count as one sample.
 */
import { DEFAULT_FONT_KEY, fontByFamily, fontEntry, nearestWeight } from "@/lib/carousel/fonts";
import { publicUrl, writeObject } from "@/server/carousel/repo/storage";
import { type StudioSize } from "@/server/carousel/services/studio";

const API = "https://api.figma.com/v1";
const TIMEOUT_MS = 45_000;

export class FigmaError extends Error {
  constructor(message: string, public code: "NO_TOKEN" | "NO_ACCESS" | "BAD_LINK" | "EMPTY" | "FAILED") {
    super(message);
  }
}

export function parseFigmaLink(raw: string): { fileKey: string; nodeId: string | null } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new FigmaError("That is not a link", "BAD_LINK");
  }
  if (!/(^|\.)figma\.com$/.test(url.hostname)) throw new FigmaError("That is not a Figma link", "BAD_LINK");
  const m = url.pathname.match(/^\/(?:design|file|board|proto)\/([0-9A-Za-z]{10,128})(?:\/branch\/([0-9A-Za-z]{10,128}))?/);
  if (!m) throw new FigmaError("The link does not point at a Figma design file", "BAD_LINK");
  const node = url.searchParams.get("node-id");
  return { fileKey: m[2] ?? m[1], nodeId: node ? node.replace("-", ":") : null };
}

// ── What comes back from Figma ──────────────────────────────────────────

interface Colour { r: number; g: number; b: number; a?: number }
interface Paint { type: string; visible?: boolean; color?: Colour; opacity?: number; imageRef?: string }
interface Effect { type: string; visible?: boolean; color?: Colour; offset?: { x: number; y: number }; radius?: number }
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number } | null;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  effects?: Effect[];
  characters?: string;
  style?: { fontFamily?: string; fontWeight?: number; fontSize?: number; textAlignHorizontal?: string; lineHeightPx?: number };
  backgroundColor?: Colour;
}

async function figmaGet<T>(path: string): Promise<T> {
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new FigmaError("Figma is not connected: FIGMA_TOKEN is not set on the server", "NO_TOKEN");
  const res = await fetch(`${API}${path}`, { headers: { "X-Figma-Token": token }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (res.status === 403 || res.status === 404) throw new FigmaError("No access to that file. Share it with the Figma account the app uses, or check the link.", "NO_ACCESS");
  if (res.status === 429) throw new FigmaError("Figma is rate-limiting us; try again in a minute", "FAILED");
  if (!res.ok) throw new FigmaError(`Figma answered HTTP ${res.status}`, "FAILED");
  return (await res.json()) as T;
}

/** The file's name and the node the link points at (the first page when it names none). */
export async function readFigma(fileKey: string, nodeId: string | null): Promise<{ name: string; node: FigmaNode }> {
  if (nodeId) {
    const json = await figmaGet<{ name: string; nodes: Record<string, { document: FigmaNode } | null> }>(`/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(nodeId)}&geometry=paths`);
    const node = json.nodes[nodeId]?.document;
    if (!node) throw new FigmaError("That node is not in the file", "NO_ACCESS");
    return { name: json.name, node };
  }
  const json = await figmaGet<{ name: string; document: FigmaNode }>(`/files/${encodeURIComponent(fileKey)}`);
  const page = json.document.children?.[0];
  if (!page) throw new FigmaError("The file has no pages", "EMPTY");
  return { name: json.name, node: page };
}

/** Links to the pictures used as fills, by image reference; they expire, so they are copied at once. */
export async function readFigmaImages(fileKey: string): Promise<Record<string, string>> {
  const json = await figmaGet<{ meta?: { images?: Record<string, string> } }>(`/files/${encodeURIComponent(fileKey)}/images`);
  return json.meta?.images ?? {};
}

// ── Reading the layout ──────────────────────────────────────────────────

export interface FigmaText {
  name: string;
  text: string;
  /** Centre and size as ratios of the frame. */
  x: number;
  y: number;
  width: number;
  family: string | null;
  weight: number;
  /** In the frame's own pixels. */
  size: number;
  align: "left" | "center" | "right";
  fill: string;
  stroke: { width: number; color: string } | null;
  shadow: { dx: number; dy: number; blur: number; color: string; opacity: number } | null;
}
export interface FigmaFrame {
  name: string;
  width: number;
  height: number;
  background: string | null;
  /** The picture that fills the frame, or a child that does: its box as ratios and its reference. */
  image: { x: number; y: number; w: number; h: number; ref: string } | null;
  texts: FigmaText[];
}
export interface FigmaLayout {
  /** Each sample is one deck of frames, in slide order. */
  samples: FigmaFrame[][];
}

const visible = (n: { visible?: boolean }) => n.visible !== false;
const hex = (c: Colour) => "#" + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const solid = (paints: Paint[] | undefined) => paints?.find((p) => p.type === "SOLID" && visible(p) && p.color) ?? null;
const imagePaint = (paints: Paint[] | undefined) => paints?.find((p) => p.type === "IMAGE" && visible(p) && p.imageRef) ?? null;

/**
 * Frames in reading order: row by row, left to right. The names are not
 * trusted for order, because Garreth's sample numbers its second row 4, 5,
 * 6 in a different order from where the frames sit; where they sit is what
 * a person reading the file sees.
 */
function orderFrames(frames: FigmaNode[]): FigmaNode[] {
  const top = Math.min(...frames.map((f) => f.absoluteBoundingBox?.y ?? 0));
  const rowHeight = Math.max(1, Math.min(...frames.map((f) => f.absoluteBoundingBox?.height ?? 1))) * 0.8;
  const row = (f: FigmaNode) => Math.floor(((f.absoluteBoundingBox?.y ?? 0) - top) / rowHeight);
  return [...frames].sort((a, b) => row(a) - row(b) || (a.absoluteBoundingBox?.x ?? 0) - (b.absoluteBoundingBox?.x ?? 0));
}

function readFrame(frame: FigmaNode): FigmaFrame {
  const box = frame.absoluteBoundingBox ?? { x: 0, y: 0, width: 1080, height: 1920 };
  const W = box.width || 1080, H = box.height || 1920;
  const rel = (b: { x: number; y: number; width: number; height: number }) => ({ x: (b.x - box.x) / W, y: (b.y - box.y) / H, w: b.width / W, h: b.height / H });
  let image: FigmaFrame["image"] = null;
  const own = imagePaint(frame.fills);
  if (own) image = { x: 0, y: 0, w: 1, h: 1, ref: own.imageRef! };
  const texts: FigmaText[] = [];
  const walk = (n: FigmaNode) => {
    if (!visible(n)) return;
    if (n.type === "TEXT" && n.characters?.trim() && n.absoluteBoundingBox) {
      const r = rel(n.absoluteBoundingBox);
      const fill = solid(n.fills);
      const stroke = solid(n.strokes);
      const shadow = n.effects?.find((e) => e.type === "DROP_SHADOW" && visible(e)) ?? null;
      const align = n.style?.textAlignHorizontal === "LEFT" ? "left" : n.style?.textAlignHorizontal === "RIGHT" ? "right" : "center";
      texts.push({
        name: n.name,
        text: n.characters.trim(),
        x: r.x + r.w / 2,
        y: r.y + r.h / 2,
        width: r.w,
        family: n.style?.fontFamily ?? null,
        weight: n.style?.fontWeight ?? 700,
        size: n.style?.fontSize ?? 48,
        align,
        fill: fill ? hex(fill.color!) : "#FFFFFF",
        stroke: stroke && (n.strokeWeight ?? 0) > 0 ? { width: n.strokeWeight!, color: hex(stroke.color!) } : null,
        shadow: shadow ? { dx: shadow.offset?.x ?? 0, dy: shadow.offset?.y ?? 0, blur: shadow.radius ?? 0, color: shadow.color ? hex(shadow.color) : "#000000", opacity: shadow.color?.a ?? 0.6 } : null,
      });
      return;
    }
    const paint = imagePaint(n.fills);
    if (paint && n.absoluteBoundingBox) {
      const r = rel(n.absoluteBoundingBox);
      // The biggest picture is the slide's photo; a small one is decoration we cannot keep.
      if (r.w * r.h >= 0.5 && (!image || r.w * r.h > image.w * image.h)) image = { x: Math.max(0, r.x), y: Math.max(0, r.y), w: Math.min(1, r.w), h: Math.min(1, r.h), ref: paint.imageRef! };
      if (n.type !== "TEXT") n.children?.forEach(walk);
      return;
    }
    n.children?.forEach(walk);
  };
  frame.children?.forEach(walk);
  const bg = solid(frame.fills);
  return { name: frame.name, width: W, height: H, background: bg ? hex(bg.color!) : frame.backgroundColor ? hex(frame.backgroundColor) : null, image, texts };
}

const isFrame = (n: FigmaNode) => (n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE") && visible(n) && Boolean(n.absoluteBoundingBox);

/** The samples and their slides under the linked node. */
export function readLayout(node: FigmaNode): FigmaLayout {
  const samples: FigmaFrame[][] = [];
  if (isFrame(node)) samples.push([readFrame(node)]);
  else if (node.type === "SECTION" || node.type === "GROUP") {
    const frames = orderFrames((node.children ?? []).filter(isFrame));
    if (frames.length) samples.push(frames.map(readFrame));
  } else {
    const loose = orderFrames((node.children ?? []).filter(isFrame));
    if (loose.length) samples.push(loose.map(readFrame));
    for (const child of node.children ?? []) {
      if ((child.type === "SECTION" || child.type === "GROUP") && visible(child)) {
        const frames = orderFrames((child.children ?? []).filter(isFrame));
        if (frames.length) samples.push(frames.map(readFrame));
      }
    }
  }
  if (!samples.length) throw new FigmaError("No frames found under that link. Each slide should be a frame, with the samples in sections.", "EMPTY");
  return { samples };
}

// ── The template ────────────────────────────────────────────────────────

export interface FigmaImport {
  template: Record<string, unknown>;
  sample: Record<string, string>;
  size: StudioSize;
  /** Plain-language notes for the conversation: what was fixed, pinned, substituted. */
  notes: string[];
}

const SIZES: Record<StudioSize, { width: number; height: number }> = { "4:5": { width: 1080, height: 1350 }, "9:16": { width: 1080, height: 1920 } };

export function sizeFor(frame: FigmaFrame): StudioSize {
  return frame.height / frame.width > 1.5 ? "9:16" : "4:5";
}

function roleFor(t: FigmaText, slide: number, index: number, taken: Set<string>): string {
  let base = t.name.trim() === t.text || t.name.trim().length > 40 ? (slide === 0 && index === 0 ? "hook" : `line_${slide + 1}${index ? `_${index + 1}` : ""}`) : t.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
  if (!base) base = `line_${slide + 1}`;
  let role = base;
  for (let k = 2; taken.has(role); k++) role = `${base}_${k}`;
  taken.add(role);
  return role;
}

/**
 * Builds the template from the layout, on a blank template of the frames'
 * size. `pinnedUrls` maps an image reference to a copy of the picture in
 * our storage, for pictures that are the same in every sample.
 */
export function templateFromFigma(base: Record<string, unknown>, layout: FigmaLayout, pinnedUrls: Record<string, string>): FigmaImport {
  const first = layout.samples[0];
  const size = sizeFor(first[0]);
  const canvas = SIZES[size];
  const fonts = { ...((base.fonts as Record<string, unknown>) ?? {}) };
  const styles = Object.keys((base.text_styles as Record<string, unknown>) ?? {});
  const styleName = styles[0] ?? "caption";
  const contract: Record<string, unknown>[] = [];
  const sample: Record<string, string> = {};
  const notes: string[] = [];
  const substituted = new Set<string>();
  const taken = new Set<string>();
  const many = layout.samples.length > 1;
  const slides = first.map((frame, i) => {
    const scale = canvas.width / frame.width;
    const others = layout.samples.slice(1).map((s) => s[i]).filter(Boolean);
    const cell = frame.image ? { x: Math.round(frame.image.x * canvas.width), y: Math.round(frame.image.y * canvas.height), w: Math.round(frame.image.w * canvas.width), h: Math.round(frame.image.h * canvas.height) } : { x: 0, y: 0, w: canvas.width, h: canvas.height };
    const images: Record<string, unknown> = { rule: "one" };
    if (frame.image && many && others.every((o) => o.image?.ref === frame.image!.ref) && pinnedUrls[frame.image.ref]) {
      images.pinned = [{ cell: 0, url: pinnedUrls[frame.image.ref] }];
      notes.push(`Slide ${i + 1} is the same picture in every sample, so it is pinned.`);
    }
    const text = frame.texts.map((t, k) => {
      const role = roleFor(t, i, k, taken);
      const font = t.family ? fontByFamily(t.family) : null;
      const key = font?.key ?? DEFAULT_FONT_KEY;
      if (!font && t.family) substituted.add(t.family);
      if (!fonts[key]) fonts[key] = fontEntry(key);
      const weight = nearestWeight(font ?? fontByFamily("Inter")!, t.weight);
      const fixed = many && others.every((o) => o.texts[k]?.text === t.text);
      contract.push(fixed ? { role, writer: "fixed", fixed: t.text, columns: [role] } : { role, writer: "ai", max_chars: Math.max(40, Math.min(200, t.text.length * 2)), columns: [role] });
      sample[role] = t.text;
      if (fixed) notes.push(`"${t.text.slice(0, 40)}${t.text.length > 40 ? "…" : ""}" on slide ${i + 1} reads the same in every sample, so it is fixed.`);
      return {
        role,
        style: styleName,
        size: Math.max(16, Math.round(t.size * scale)),
        anchor: { kind: "free", x: Math.round(t.x * 1000) / 1000, y: Math.round(t.y * 1000) / 1000 },
        purpose: fixed ? "" : k === 0 && i === 0 ? "The opening line that earns the swipe" : `Slide ${i + 1}'s line`,
        font: key,
        weight,
        fill: t.fill,
        align: t.align,
        wrap: { rule: "greedy_whitespace", width: Math.max(300, Math.min(canvas.width, Math.round(t.width * canvas.width * 1.08))) },
        stroke: t.stroke ? { width: Math.round(t.stroke.width * scale), color: t.stroke.color } : null,
        shadow: t.shadow ? { kind: t.shadow.blur > 0 ? "soft" : "hard", dx: Math.round(t.shadow.dx * scale), dy: Math.round(t.shadow.dy * scale), blur: Math.round(t.shadow.blur * scale), color: t.shadow.color, opacity: Math.round(t.shadow.opacity * 100) / 100, stroked: false } : null,
      };
    });
    return { n: i + 1, layout: "single", cells: [cell], images, text };
  });
  if (substituted.size) notes.push(`${[...substituted].join(", ")} ${substituted.size === 1 ? "is" : "are"} not among the slide fonts, so Inter stands in; pick another in Adjustments.`);
  if (!many) notes.push("One sample only, so every line is for the writer and every picture comes from the library. Put two or more samples in sections to mark what stays fixed.");
  const template = {
    ...base,
    canvas: { ...(base.canvas as object), width: canvas.width, height: canvas.height, background: first[0].background ?? (base.canvas as { background?: string }).background ?? "#0C0A09" },
    fonts,
    slides,
    copy_contract: [...contract, ...((base.copy_contract as Record<string, unknown>[]) ?? []).filter((c) => !c.painted && !contract.some((k) => k.role === c.role))],
    sample_copy: sample,
  };
  return { template, sample, size, notes };
}

/** Pictures that repeat across every sample, copied into our storage so the pins outlive Figma's short-lived links. */
export async function copyRepeatedPictures(fileKey: string, layout: FigmaLayout): Promise<Record<string, string>> {
  if (layout.samples.length < 2) return {};
  const refs = new Set<string>();
  layout.samples[0].forEach((frame, i) => {
    const ref = frame.image?.ref;
    if (ref && layout.samples.slice(1).every((s) => s[i]?.image?.ref === ref)) refs.add(ref);
  });
  if (!refs.size) return {};
  const links = await readFigmaImages(fileKey);
  const out: Record<string, string> = {};
  for (const ref of refs) {
    const link = links[ref];
    if (!link) continue;
    try {
      const res = await fetch(link, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      if (!res.ok) continue;
      const type = res.headers.get("content-type")?.split(";")[0] ?? "image/png";
      const ext = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
      const path = `figma/${fileKey}/${ref}.${ext}`;
      await writeObject(path, Buffer.from(await res.arrayBuffer()), type);
      out[ref] = publicUrl(path);
    } catch (err) {
      console.error(`figma picture ${ref} could not be copied`, err);
    }
  }
  return out;
}
