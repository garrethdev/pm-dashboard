export type TextAnchor =
  | { kind: "block_centre_y"; at: number }
  | { kind: "top"; y: number }
  | { kind: "bottom"; margin: number }
  | { kind: "stack_right"; top: number; right: number };
export interface TextLayoutInput {
  text: string;
  canvas: { width: number; height: number };
  wrap: { rule: "greedy_whitespace"; width: number } | { rule: "explicit_lines" };
  size: number;
  lineHeight: { px: number } | { ratio: number };
  anchor: TextAnchor;
  font: { ascender: number; unitsPerEm: number };
}

/** DEV-04 layout math, independent of rasterization. measure must use the actual
 * font/run advances at input.size, including emoji advances. No guessed metrics,
 * auto-fit, hyphenation or stroke-width padding is applied to wrapping.
 */
export function layoutText(input: TextLayoutInput, measure: (text: string) => number) {
  const positive = (n: number) => Number.isFinite(n) && n > 0;
  if (!positive(input.canvas.width) || !positive(input.canvas.height) || !positive(input.size) ||
      !positive(input.font.unitsPerEm) || !Number.isFinite(input.font.ascender) || input.font.ascender < 0 ||
      typeof input.text !== "string") throw new Error("Invalid text layout metrics");
  const lineHeight = "px" in input.lineHeight ? input.lineHeight.px : input.lineHeight.ratio * input.size;
  if (!positive(lineHeight)) throw new Error("Invalid line height");
  const width = (text: string) => {
    const n = measure(text);
    if (!Number.isFinite(n) || n < 0) throw new Error("Invalid measured text width");
    return n;
  };
  let lines: string[] = [];
  if (input.wrap.rule === "explicit_lines") {
    lines = input.text === "" ? [] : input.text.replace(/\r\n?/g, "\n").split("\n");
  } else {
    if (input.wrap.rule !== "greedy_whitespace" || !positive(input.wrap.width)) throw new Error("Invalid wrap rule");
    const words = input.text.trim().split(/\s+/u).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      // An over-wide first word stays on its own line. Do not reproduce the
      // legacy Glow Up bug that emitted a blank line before that word.
      if (current && width(candidate) > input.wrap.width) { lines.push(current); current = word; }
      else current = candidate;
    }
    if (current) lines.push(current);
  }
  const height = lineHeight * lines.length;
  let top: number;
  const anchor = input.anchor;
  switch (anchor.kind) {
    case "block_centre_y": top = input.canvas.height * anchor.at - height / 2; break;
    case "top": top = anchor.y; break;
    case "bottom": top = input.canvas.height - anchor.margin - height; break;
    case "stack_right": top = anchor.top; break;
    default: throw new Error("Invalid text anchor");
  }
  if (!Number.isFinite(top) || anchor.kind === "stack_right" && !Number.isFinite(anchor.right)) throw new Error("Invalid text anchor");
  const ascender = input.font.ascender / input.font.unitsPerEm * input.size;
  return { height, lineHeight, lines: lines.map((text, index) => {
    const measured = width(text), y = top + index * lineHeight;
    return { text, width: measured, x: anchor.kind === "stack_right" ? input.canvas.width - measured - anchor.right : (input.canvas.width - measured) / 2,
      top: y, baseline: y + ascender };
  }) };
}
