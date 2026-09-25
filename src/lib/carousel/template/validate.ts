type ObjectValue = Record<string, unknown>;
export interface CopyRole extends ObjectValue {
  role: string;
  columns: string[];
  writer: "ai" | "fixed" | "per_batch";
  fixed?: string;
  max_chars?: number;
}
export interface TemplateSlide extends ObjectValue {
  n: number;
  layout: "single" | "quad" | "quiz";
  cells: { x: number; y: number; w: number; h: number }[];
  images: ObjectValue & { rule: string };
  text: (ObjectValue & { role: string; style: string; size: number; anchor: ObjectValue })[];
}
/** Validated cell-based v1 contract. Layered Studio templates need a separate extension. */
export interface CarouselTemplate extends ObjectValue {
  schema: "pm.carousel-template/1";
  slug: string;
  version: number;
  canvas: { width: number; height: number; background: string | null };
  slides: TemplateSlide[];
  copy_contract: CopyRole[];
  text_styles: Record<string, ObjectValue>;
}
export class TemplateError extends Error {
  constructor(readonly field: string, message: string) { super(`${field}: ${message}`); }
}
function requireThat(ok: unknown, path: string, message: string): asserts ok {
  if (!ok) throw new TemplateError(path, message);
}
function object(value: unknown, path: string): ObjectValue {
  requireThat(value && typeof value === "object" && !Array.isArray(value), path, "expected object");
  return value as ObjectValue;
}
function list(value: unknown, path: string): unknown[] {
  requireThat(Array.isArray(value), path, "expected array");
  return value;
}
function text(value: unknown, path: string): string {
  requireThat(typeof value === "string" && value.trim().length > 0, path, "expected nonempty text");
  return value;
}
function number(value: unknown, path: string, min = 0): number {
  requireThat(typeof value === "number" && Number.isFinite(value) && value >= min, path, `expected number >= ${min}`);
  return value;
}
const own = (o: ObjectValue, k: string) => Object.hasOwn(o, k);

function finite(value: unknown, path: string): number {
  requireThat(typeof value === "number" && Number.isFinite(value), path, "expected finite number");
  return value;
}
function positive(value: unknown, path: string): number {
  const result = number(value, path);
  requireThat(result > 0, path, "expected positive number");
  return result;
}
function textList(value: unknown, path: string) {
  const items = list(value, path);
  requireThat(items.length > 0, path, "expected nonempty array");
  items.forEach((item, i) => text(item, `${path}[${i}]`));
}

/** Validate the effective style, including per-box overrides (§1 and §2).
 * Do not merge nested objects: a box's pixel line height replaces a ratio.
 */
function validateStyle(style: ObjectValue, path: string, fonts: ObjectValue) {
  requireThat(own(fonts, text(style.font, `${path}.font`)), `${path}.font`, "unknown font");
  text(style.fill, `${path}.fill`);
  requireThat(["center", "right"].includes(String(style.align)), `${path}.align`, "unsupported alignment");
  const height = object(style.line_height, `${path}.line_height`);
  requireThat(own(height, "px") !== own(height, "ratio"), `${path}.line_height`, "specify exactly one of px or ratio");
  positive(height.px ?? height.ratio, `${path}.line_height.${own(height, "px") ? "px" : "ratio"}`);
  const wrap = object(style.wrap, `${path}.wrap`);
  requireThat(["greedy_whitespace", "explicit_newlines"].includes(String(wrap.rule)), `${path}.wrap.rule`, "unsupported wrapping rule");
  if (wrap.rule === "greedy_whitespace") positive(wrap.width, `${path}.wrap.width`);
  if (style.stroke !== undefined && style.stroke !== null) {
    const stroke = object(style.stroke, `${path}.stroke`);
    number(stroke.width, `${path}.stroke.width`);
    text(stroke.color, `${path}.stroke.color`);
  }
  if (style.shadow !== undefined && style.shadow !== null) {
    const shadow = object(style.shadow, `${path}.shadow`);
    requireThat(["hard", "soft"].includes(String(shadow.kind)), `${path}.shadow.kind`, "unsupported shadow");
    finite(shadow.dx, `${path}.shadow.dx`); finite(shadow.dy, `${path}.shadow.dy`);
    number(shadow.blur, `${path}.shadow.blur`);
    requireThat(number(shadow.opacity, `${path}.shadow.opacity`) <= 1, `${path}.shadow.opacity`, "expected ratio <= 1");
    text(shadow.color, `${path}.shadow.color`);
    requireThat(shadow.stroked === false, `${path}.shadow.stroked`, "shadow pass must have no stroke");
  }
  if (style.emoji !== undefined && style.emoji !== null) {
    const emoji = object(style.emoji, `${path}.emoji`);
    requireThat(own(fonts, text(emoji.font, `${path}.emoji.font`)), `${path}.emoji.font`, "unknown font");
    positive(emoji.height_ratio, `${path}.emoji.height_ratio`);
    for (const key of ["advance_extra", "x_offset", "y_offset_ratio", "shadow_y_offset_ratio"]) finite(emoji[key], `${path}.emoji.${key}`);
    if (emoji.strip !== undefined) list(emoji.strip, `${path}.emoji.strip`).forEach((item, i) => text(item, `${path}.emoji.strip[${i}]`));
  }
}

/**
 * DEV-03: reject structurally inconsistent templates before writing or painting.
 * Historical imports may be read verbatim, but cannot be activated unless they
 * pass generation checks. This preserves evidence without silently copying obsolete
 * 3:4 geometry or the legacy risk-gate 'pending' value into new production decks.
 * This is structural validation, not a guarantee of pixel parity or safe lane SQL.
 */
export function validateTemplate(value: unknown, purpose: "historical" | "generation" = "generation"): CarouselTemplate {
  const t = object(value, "template");
  requireThat(t.schema === "pm.carousel-template/1", "schema", "unsupported schema");
  text(t.slug, "slug");
  requireThat(Number.isSafeInteger(t.version) && Number(t.version) > 0, "version", "expected positive integer");
  const canvas = object(t.canvas, "canvas");
  const width = number(canvas.width, "canvas.width", 1), height = number(canvas.height, "canvas.height", 1);
  requireThat(Number.isInteger(width) && Number.isInteger(height) && width <= 4096 && height <= 4096, "canvas", "invalid dimensions");
  if (purpose === "generation") requireThat(width === 1080 && [1350, 1920].includes(height), "canvas", "new decks must be 1080x1350 or 1080x1920");
  if (canvas.background !== null) text(canvas.background, "canvas.background");
  requireThat(t.text_origin === "ascender", "text_origin", "expected ascender");
  const output = object(t.output, "output");
  requireThat(["jpeg", "png"].includes(String(output.format)), "output.format", "unsupported format");
  if (output.format === "jpeg" || output.quality !== undefined) requireThat(number(output.quality, "output.quality", 1) <= 100, "output.quality", "expected quality <= 100");
  text(output.bucket, "output.bucket"); text(output.path, "output.path");
  const fit = object(t.fit, "fit");
  requireThat(fit.mode === "cover", "fit.mode", "expected cover");
  requireThat(fit.position === "centre", "fit.position", "expected centre");
  requireThat(["bicubic", "lanczos"].includes(String(fit.resample)), "fit.resample", "unsupported resampling filter");
  requireThat(typeof fit.exif_transpose === "boolean", "fit.exif_transpose", "expected boolean");
  const styles = object(t.text_styles, "text_styles"), fonts = object(t.fonts, "fonts");
  for (const [name, raw] of Object.entries(fonts)) {
    const font = object(raw, `fonts.${name}`);
    text(font.family, `fonts.${name}.family`); text(font.file, `fonts.${name}.file`);
  }
  for (const [name, raw] of Object.entries(styles)) {
    const style = object(raw, `text_styles.${name}`);
    validateStyle(style, `text_styles.${name}`, fonts);
  }
  const roles = new Set<string>(), columns = new Set<string>();
  list(t.copy_contract, "copy_contract").forEach((raw, i) => {
    const path = `copy_contract[${i}]`, role = object(raw, path), name = text(role.role, `${path}.role`);
    requireThat(!roles.has(name), `${path}.role`, "duplicate role"); roles.add(name);
    requireThat(["ai", "fixed", "per_batch"].includes(String(role.writer)), `${path}.writer`, "unknown writer");
    const targets = list(role.columns, `${path}.columns`);
    // The imported quiz CTA is fixed and the datestamp is stored in the manifest.
    // Neither has a lane column; other roles must have an explicit destination.
    requireThat(targets.length || role.writer === "fixed" || role.stored_in === "render_manifest", `${path}.columns`, "missing lane destination");
    for (const target of targets) {
      const col = text(target, `${path}.columns`);
      requireThat(/^[a-z][a-z0-9_]*$/.test(col) && !columns.has(col), `${path}.columns`, "invalid or duplicate lane column"); columns.add(col);
    }
    if (role.writer === "fixed") text(role.fixed, `${path}.fixed`);
    if (role.max_chars !== undefined) requireThat(Number.isSafeInteger(role.max_chars) && Number(role.max_chars) > 0, `${path}.max_chars`, "expected positive integer");
  });
  const rules = object(t.image_rules, "image_rules");
  const slides = list(t.slides, "slides");
  requireThat(slides.length > 0 && slides.length <= 50, "slides", "expected 1–50 slides");
  slides.forEach((raw, i) => {
    const path = `slides[${i}]`, slide = object(raw, path);
    requireThat(slide.n === i + 1, `${path}.n`, "slide numbers must be contiguous and ordered");
    requireThat(["single", "quad", "quiz"].includes(String(slide.layout)), `${path}.layout`, "unsupported layout");
    const cells = list(slide.cells, `${path}.cells`);
    requireThat(cells.length === (slide.layout === "quad" ? 4 : 1), `${path}.cells`, "cell count does not match layout");
    cells.forEach((rawCell, j) => {
      const p = `${path}.cells[${j}]`, cell = object(rawCell, p);
      const x = number(cell.x, `${p}.x`), y = number(cell.y, `${p}.y`);
      const w = number(cell.w, `${p}.w`, 1), h = number(cell.h, `${p}.h`, 1);
      requireThat(x + w <= width && y + h <= height, p, "cell extends outside canvas");
    });
    const images = object(slide.images, `${path}.images`);
    requireThat(own(rules, text(images.rule, `${path}.images.rule`)), `${path}.images.rule`, "unknown image rule");
    // These are the v1 rules in the imported rulebook; do not invent the
    // future library/layer binding contract here.
    // DEV-06: no set binding (absent or empty) deliberately selects from the
    // whole library. A supplied binding must still contain valid set names.
    if (["one", "distinct"].includes(String(images.rule)) && images.pools !== undefined) {
      list(images.pools, `${path}.images.pools`).forEach((pool, index) => text(pool, `${path}.images.pools[${index}]`));
    }
    if (images.rule === "diagonal_pairs") {
      requireThat(slide.layout === "quad", `${path}.images.rule`, "diagonal pairs require four cells");
      textList(images.body_pools, `${path}.images.body_pools`);
      textList(images.evidence_pools, `${path}.images.evidence_pools`);
    }
    list(slide.text, `${path}.text`).forEach((rawBox, j) => {
      const p = `${path}.text[${j}]`, box = object(rawBox, p);
      requireThat(roles.has(text(box.role, `${p}.role`)), `${p}.role`, "unknown copy role");
      requireThat(own(styles, text(box.style, `${p}.style`)), `${p}.style`, "unknown text style");
      validateStyle({ ...object(styles[String(box.style)], `${p}.style`), ...box }, p, fonts);
      number(box.size, `${p}.size`, 1);
      const anchor = object(box.anchor, `${p}.anchor`);
      requireThat(["top", "bottom", "stack_right", "block_centre_y"].includes(String(anchor.kind)), `${p}.anchor.kind`, "unsupported anchor");
      const fields = anchor.kind === "top" ? ["y"] : anchor.kind === "bottom" ? ["margin"] : anchor.kind === "stack_right" ? ["right", "top"] : ["at"];
      for (const field of fields) number(anchor[field], `${p}.anchor.${field}`);
      if (anchor.kind === "block_centre_y") requireThat(Number(anchor.at) <= 1, `${p}.anchor.at`, "expected ratio <= 1");
    });
  });
  if (purpose === "generation" && t.lane !== null && t.lane !== undefined) {
    const lane = object(t.lane, "lane"), initial = object(lane.set_on_materialise, "lane.set_on_materialise");
    for (const field of ["approved", "scheduler_ready"]) requireThat(initial[field] === undefined || initial[field] === false, `lane.set_on_materialise.${field}`, "materialisation cannot approve or schedule; expected false or absent");
    requireThat(initial.gatekeep_status === undefined || initial.gatekeep_status === null, "lane.set_on_materialise.gatekeep_status", "risk verdict must come from the gate, not the template");
  }
  return structuredClone(t) as CarouselTemplate;
}

/** Reassembles §6's split JSON columns, then validates exactly like a file import. */
export function templateFromRow(raw: unknown, purpose: "historical" | "generation" = "generation") {
  const row = object(raw, "row"), canvas = object(row.canvas, "row.canvas"), slides = object(row.slides, "row.slides"), copy = object(row.copy_contract, "row.copy_contract");
  return validateTemplate({
    schema: "pm.carousel-template/1", slug: row.slug, version: row.version,
    status: row.status, name: row.name, character: row.character, content_type: row.content_type,
    canvas: canvas.canvas, output: canvas.output, fit: canvas.fit, text_origin: canvas.text_origin,
    fonts: canvas.fonts, text_styles: canvas.text_styles,
    slides: slides.slides, image_sources: slides.image_sources, image_rules: slides.image_rules,
    copy_contract: copy.copy_contract, not_painted: copy.not_painted, music: copy.music,
    directions: { copy: row.copy_direction, caption: row.caption_direction, image: row.image_direction },
    lane: row.lane, provenance: { ...object(row.generation_metadata ?? {}, "row.generation_metadata"), source_reference_id: row.source_reference_id },
  }, purpose);
}
