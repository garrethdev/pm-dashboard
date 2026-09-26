import { layoutText, type TextLayoutInput } from "./text-layout";
export interface TextPaint {
  fontFamily: string;
  fill: string;
  stroke: { color: string; width: number };
  shadow?: { kind: "hard" | "soft"; color: string; opacity: number; dx: number; dy: number; blur?: number };
}
const xml = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const color = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

/** Text-only SVG layers; bundled font registration must match measurement.
 * No embedded URLs, raw markup, CSS, scripts or automatic font fallback assets.
 * Composite shadow first (blur separately for soft), then foreground. Emoji is
 * deliberately refused until the bitmap-run painter implements its exact metrics.
 */
export function paintTextLayers(input: TextLayoutInput, paint: TextPaint, measure: (text: string) => number) {
  if (typeof input.text !== "string" || input.text.length > 20_000 ||
      [...input.text].some(char => { const n = char.codePointAt(0)!; return n < 32 && ![9, 10, 13].includes(n) || n >= 0xd800 && n <= 0xdfff || n === 0xfffe || n === 0xffff; })) throw new Error("Invalid SVG text");
  if (/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3\ufe0f]/u.test(input.text)) throw new Error("Emoji bitmap painting is not implemented");
  if (!/^[a-zA-Z0-9 -]{1,100}$/.test(paint.fontFamily) || !color(paint.fill) || !color(paint.stroke.color) ||
      !Number.isFinite(paint.stroke.width) || paint.stroke.width < 0 || paint.stroke.width > 100 ||
      input.canvas.width > 8192 || input.canvas.height > 8192 || input.size > 4096) throw new Error("Invalid SVG paint settings");
  const shadow = paint.shadow;
  if (shadow && (!["hard", "soft"].includes(shadow.kind) || !color(shadow.color) ||
      !Number.isFinite(shadow.opacity) || shadow.opacity < 0 || shadow.opacity > 1 ||
      !Number.isFinite(shadow.dx) || !Number.isFinite(shadow.dy) ||
      Math.abs(shadow.dx) > 8192 || Math.abs(shadow.dy) > 8192 ||
      shadow.kind === "soft" && (typeof shadow.blur !== "number" || !Number.isFinite(shadow.blur) || shadow.blur <= 0 || shadow.blur > 1000))) throw new Error("Invalid SVG shadow");
  const layout = layoutText(input, measure);
  const wrap = (content: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${input.canvas.width}" height="${input.canvas.height}" viewBox="0 0 ${input.canvas.width} ${input.canvas.height}">${content}</svg>`;
  const text = (dx: number, dy: number, attributes: string) => layout.lines.map(line =>
    `<text x="${line.x + dx}" y="${line.baseline + dy}" font-family="${xml(paint.fontFamily)}" font-size="${input.size}" xml:space="preserve" ${attributes}>${xml(line.text)}</text>`).join("");
  return {
    foreground: wrap(text(0, 0, `fill="${paint.fill}" stroke="${paint.stroke.color}" stroke-width="${paint.stroke.width}" stroke-linejoin="round" paint-order="stroke fill"`)),
    shadow: shadow ? { svg: wrap(text(shadow.dx, shadow.dy, `fill="${shadow.color}" fill-opacity="${shadow.opacity}" stroke="none"`)),
      blurSigma: shadow.kind === "soft" ? shadow.blur! : 0 } : null,
    layout,
  };
}
