/**
 * The Studio's server side (DEV-23, DEV-22): drafting a template from an
 * idea or from a reference deck, sample copy for the canvas, and the render
 * preview. A drafted template is always a full `pm.carousel-template/1`
 * object, so what reaches the canvas is what the writer and painter read.
 * Reference text and model output are untrusted: plain text only.
 */
import type { CarouselTemplate } from "@/lib/carousel/template/validate";
import { validateTemplate } from "@/lib/carousel/template/validate";
import { listAssets } from "@/server/carousel/repo/libraries";
import { getReference } from "@/server/carousel/repo/trends";
import { paintDeck, type PaintTemplate } from "@/server/carousel/services/painter";
import { settledRoles, writeDeck, writerAvailable, type CopyRole } from "@/server/carousel/services/writer";

export type StudioSize = "4:5" | "9:16";

export interface DraftSlide {
  layout: "single" | "quad";
  boxes: { name: string; purpose: string; size: number; at: number }[];
  set: string | null;
}

export interface DraftSpec {
  name: string;
  slides: DraftSlide[];
  direction: string;
  sample: Record<string, string>;
}

/** A box name from a beat or a free label: lower snake case, "hook" for the first slide. */
function roleName(label: string | null | undefined, index: number): string {
  if (index === 0) return "hook";
  return (label ?? `line_${index + 1}`).replace(/[^a-z0-9]+/gi, "_").toLowerCase().replace(/(^_|_$)/g, "") || `line_${index + 1}`;
}

const SIZES: Record<StudioSize, { width: number; height: number }> = { "4:5": { width: 1080, height: 1350 }, "9:16": { width: 1080, height: 1920 } };

/** A valid empty template at a size, with one caption style and no slides yet. */
export function blankTemplate(slug: string, name: string, character: string, size: StudioSize): Record<string, unknown> {
  return {
    schema: "pm.carousel-template/1",
    slug,
    version: 1,
    status: "draft",
    name,
    character,
    content_type: null,
    canvas: { ...SIZES[size], background: "#0C0A09" },
    output: { format: "jpeg", quality: 92, bucket: "carousel-renders", path: `${slug}/{deck_id}/slide_{nn}.jpg` },
    fit: { mode: "cover", position: "centre", resample: "lanczos", exif_transpose: true },
    text_origin: "ascender",
    fonts: { caption: { family: "Inter", weight: 700, file: "Inter-Bold.ttf" } },
    text_styles: {
      caption: {
        font: "caption",
        fill: "#FFFFFF",
        stroke: { width: 6, color: "#000000" },
        shadow: { kind: "soft", dx: 4, dy: 4, blur: 16, color: "#000000", opacity: 0.6, stroked: false },
        line_height: { ratio: 1.15 },
        wrap: { rule: "greedy_whitespace", width: Math.round(SIZES[size].width * 0.88) },
        align: "center",
        emoji: null,
      },
    },
    image_sources: { library: true },
    slides: [],
    image_rules: { one: "One image drawn from the sets.", distinct: "One image per cell, drawn without replacement." },
    copy_contract: [{ role: "caption", columns: ["caption"], writer: "ai", painted: false, max_chars: 600 }],
    directions: { copy: null, caption: null, image: null },
    music: { column: "music", writer: "ai" },
    lane: null,
    provenance: { made_in: "studio" },
  };
}

/** Turn a draft spec into a full template: slides, boxes, contract. */
export function templateFromSpec(base: Record<string, unknown>, spec: DraftSpec): Record<string, unknown> {
  const canvas = base.canvas as { width: number; height: number };
  const roles = new Map<string, CopyRole>();
  const slides = spec.slides.map((s, i) => {
    const cells =
      s.layout === "quad"
        ? [
            { x: 0, y: 0, w: canvas.width / 2, h: canvas.height / 2 },
            { x: canvas.width / 2, y: 0, w: canvas.width / 2, h: canvas.height / 2 },
            { x: 0, y: canvas.height / 2, w: canvas.width / 2, h: canvas.height / 2 },
            { x: canvas.width / 2, y: canvas.height / 2, w: canvas.width / 2, h: canvas.height / 2 },
          ]
        : [{ x: 0, y: 0, w: canvas.width, h: canvas.height }];
    const text = s.boxes.map((b) => {
      const role = b.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") || `text_box_${i + 1}`;
      if (!roles.has(role)) roles.set(role, { role, columns: [role], writer: "ai", max_chars: 120 });
      return { role, style: "caption", size: Math.max(28, Math.min(96, Math.round(b.size || 60))), anchor: { kind: "block_centre_y", at: Math.max(0.05, Math.min(0.95, b.at || 0.5)) }, purpose: b.purpose };
    });
    return { n: i + 1, layout: s.layout === "quad" ? "quad" : "single", cells, images: { rule: s.layout === "quad" ? "distinct" : "one", ...(s.set ? { pools: [s.set] } : {}) }, text };
  });
  const contract = [...roles.values(), ...((base.copy_contract as CopyRole[]) ?? []).filter((r) => r.role === "caption")];
  return { ...base, name: spec.name || base.name, slides, copy_contract: contract, directions: { ...(base.directions as object), copy: spec.direction }, sample_copy: spec.sample };
}

async function askModel(prompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.CAROUSEL_WRITER_MODEL || "anthropic/claude-sonnet-4.6",
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: "You design short social-media photo carousels. Reply with one JSON object only." }, { role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`The draft call failed (HTTP ${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const c = json.choices?.[0]?.message?.content;
  if (!c) throw new Error("The draft call returned nothing");
  return c;
}

function parseSpec(content: string, fallbackName: string): DraftSpec {
  const raw = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1)) as Partial<DraftSpec>;
  const slides = (Array.isArray(raw.slides) ? raw.slides : []).slice(0, 20).map((s) => ({
    layout: s.layout === "quad" ? ("quad" as const) : ("single" as const),
    boxes: (Array.isArray(s.boxes) ? s.boxes : []).slice(0, 3).map((b) => ({ name: String(b.name ?? "line").slice(0, 40), purpose: String(b.purpose ?? "").slice(0, 200), size: Number(b.size) || 60, at: Number(b.at) || 0.5 })),
    set: typeof s.set === "string" ? s.set : null,
  }));
  if (slides.length < 2) throw new Error("The draft had fewer than two slides");
  return { name: String(raw.name ?? fallbackName).slice(0, 80), slides, direction: String(raw.direction ?? "").slice(0, 4000), sample: typeof raw.sample === "object" && raw.sample ? Object.fromEntries(Object.entries(raw.sample).map(([k, v]) => [k, String(v).slice(0, 300)])) : {} };
}

function fixtureSpec(idea: string, sets: string[]): DraftSpec {
  const pick = (i: number) => sets[i % Math.max(1, sets.length)] ?? null;
  return {
    name: idea.split(/[.,\n]/)[0]?.trim().slice(0, 40) || "New carousel",
    direction: `Write ${idea.trim()}. Warm, plain, first person; each line under twelve words; the last slide names one habit.`,
    slides: [
      { layout: "single", boxes: [{ name: "hook", purpose: "The opening line that earns the swipe", size: 64, at: 0.5 }], set: pick(0) },
      { layout: "single", boxes: [{ name: "before", purpose: "Where things stood before", size: 56, at: 0.5 }], set: pick(1) },
      { layout: "quad", boxes: [{ name: "tip_one", purpose: "The first honest tip", size: 52, at: 0.5 }], set: pick(2) },
      { layout: "single", boxes: [{ name: "tip_two", purpose: "The second tip", size: 52, at: 0.5 }], set: pick(3) },
      { layout: "single", boxes: [{ name: "after", purpose: "One habit, never a product", size: 52, at: 0.5 }], set: pick(4) },
    ],
    sample: { hook: "I stopped chasing the scale and started chasing sleep.", before: "Four years stuck. I did not give up a single thing.", tip_one: "Water before coffee. Every morning.", tip_two: "A walk after dinner, no phone.", after: "Honestly the habit was the cheat code." },
  };
}

export async function draftFromIdea(idea: string, sets: string[], size: StudioSize): Promise<DraftSpec> {
  if (!writerAvailable()) return fixtureSpec(idea, sets);
  const prompt = [
    `Draft a photo carousel for this idea: ${idea}`,
    `Slide size ${size}. Between 4 and 10 slides. Each slide has a layout ("single" one photo, or "quad" four photos) and 1 or 2 text boxes.`,
    sets.length ? `The image library has these sets; give each slide the set that fits: ${sets.join(", ")}.` : "The image library has no sets yet; leave set null.",
    `Each text box has a short snake_case name (the hook is "hook"), a one-line purpose, a font size (40 to 80) and "at", where its centre sits from 0 (top) to 1 (bottom).`,
    `Also write "direction": one paragraph of writing direction for this type, and "sample": a sample line for every box name.`,
    `"name" is a short plain-English title with spaces, like "Evening Habit", never a slug.`,
    `Reply: {"name": "...", "slides": [{"layout": "single", "set": "...", "boxes": [{"name": "hook", "purpose": "...", "size": 64, "at": 0.5}]}], "direction": "...", "sample": {"hook": "..."}}`,
  ].join("\n");
  return parseSpec(await askModel(prompt), idea.slice(0, 40));
}

export async function draftFromReference(viewer: string, referenceId: number, sets: string[], size: StudioSize): Promise<{ spec: DraftSpec; reference: { handle: string | null; slides: { media: string | null; copy: string | null }[]; analysed: boolean } }> {
  const ref = await getReference(viewer, referenceId);
  if (!ref) throw new Error("Reference not found");
  const analysed = ref.slides.some((s) => s.copy !== null);
  const beats = ref.slides.map((s, i) => `Slide ${i + 1}${s.role ? ` (${s.role})` : ""}: ${s.copy?.replace(/\s+/g, " ").trim() || "(no words)"}${s.visual ? ` — ${s.visual}` : ""}`).join("\n");
  const fallback = (): DraftSpec => ({
    name: ref.handle ? `From @${ref.handle}` : "From a reference",
    direction: `Follow the reference's beats: ${ref.slides.map((s) => s.role).filter(Boolean).join(", ") || "hook, build, payoff"}. Warm, plain, first person.`,
    slides: ref.slides.map((s, i) => ({ layout: "single" as const, boxes: [{ name: roleName(s.role, i), purpose: s.copy ? `Like: ${s.copy.slice(0, 80)}` : "A line for this beat", size: i === 0 ? 64 : 54, at: 0.5 }], set: sets[i % Math.max(1, sets.length)] ?? null })),
    sample: Object.fromEntries(ref.slides.map((s, i) => [roleName(s.role, i), s.copy?.replace(/\s+/g, " ").trim().slice(0, 120) || ""])),
  });
  if (!writerAvailable() || !analysed) return { spec: fallback(), reference: { handle: ref.handle, slides: ref.slides.map((s) => ({ media: s.media, copy: s.copy })), analysed } };
  const prompt = [
    `Draft a photo carousel template that recreates the structure of this reference deck, with the same slide count and text placement, but for our own character.`,
    `Reference beats:\n${beats}`,
    `Slide size ${size}. Each slide: layout "single" or "quad" and 1 or 2 text boxes with a snake_case name (first slide's is "hook"), a purpose, a font size (40 to 80) and "at" (0 top to 1 bottom).`,
    sets.length ? `Image sets available: ${sets.join(", ")}.` : "Leave set null.",
    `Also "direction" (one paragraph) and "sample" (a fresh sample line per box, not the reference's words).`,
    `Reply: {"name": "...", "slides": [...], "direction": "...", "sample": {...}}`,
  ].join("\n");
  const spec = parseSpec(await askModel(prompt), ref.handle ? `From @${ref.handle}` : "From a reference");
  return { spec, reference: { handle: ref.handle, slides: ref.slides.map((s) => ({ media: s.media, copy: s.copy })), analysed } };
}

/** Sample copy for the canvas under the template's own contract. */
export async function sampleCopy(template: Record<string, unknown>, writing: string | null): Promise<Record<string, string>> {
  const contract = (template.copy_contract as CopyRole[]) ?? [];
  const r = await writeDeck({
    typeName: String(template.name ?? "Carousel"),
    character: String(template.character ?? ""),
    slug: String(template.slug ?? "draft"),
    contract,
    writing: writing ?? (typeof (template.directions as { copy?: string })?.copy === "string" ? (template.directions as { copy: string }).copy : null),
    note: null,
    perBatchText: {},
    feedback: null,
    avoidHooks: [],
    position: 1,
    seed: `sample:${Date.now()}`,
  });
  return { ...settledRoles(contract, {}), ...r.copy, caption: r.caption };
}

/** Paint the current, unsaved template with the real painter. */
export async function previewTemplate(template: Record<string, unknown>, libraryId: string, copy: Record<string, string>): Promise<{ position: number; svg: string }[]> {
  const t = validateTemplate({ ...template, version: Number(template.version) || 1 }, "historical") as CarouselTemplate;
  const assets = await listAssets(libraryId);
  return paintDeck(t as unknown as PaintTemplate, assets, libraryId, `preview:${Date.now()}`, copy).map((s) => ({ position: s.position, svg: s.svg }));
}
