import { parse } from "opentype.js";

/** Parse trusted, licensed static font bytes. No filesystem/network lookup and
 * no operating-system font fallback. Variable/color-emoji font support is not
 * implied by this text-metrics adapter; those need their own verified pipeline.
 */
export function loadFontMetrics(bytes: Uint8Array) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 12 || bytes.byteLength > 10_000_000) throw new Error("Invalid font data size");
  let font: ReturnType<typeof parse>;
  try { font = parse(Uint8Array.from(bytes).buffer); }
  catch { throw new Error("Font data could not be parsed"); }
  if (!Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0 || !Number.isFinite(font.ascender) || font.ascender <= 0 ||
      font.tables.fvar) throw new Error("A static font with valid ascender metrics is required");
  function measure(text: string, size: number) {
      if (typeof text !== "string" || text.length > 20_000 || !Number.isFinite(size) || size <= 0 || size > 4096) throw new Error("Invalid font measurement input");
      for (const character of text) {
        if (font.charToGlyphIndex(character) === 0) throw new Error("Selected font does not contain a required glyph");
      }
      const width = font.getAdvanceWidth(text, size, { kerning: true });
      if (!Number.isFinite(width) || width < 0) throw new Error("Invalid font advance width");
      return width;
  }
  return {
    ascender: font.ascender, unitsPerEm: font.unitsPerEm, measure,
    /** Outline the same shaped/kerning-enabled run used by measurement.
     * Only generated path commands leave this adapter, never font metadata. */
    outline(text: string, size: number, x: number, baseline: number) {
      measure(text, size);
      if (![x, baseline].every(n => Number.isFinite(n) && Math.abs(n) <= 1_000_000)) throw new Error("Invalid glyph position");
      const path = font.getPath(text, x, baseline, size, { kerning: true });
      // Font contours are closed, but the CFF decoder may omit their Z command.
      // SVG fill closes implicitly; stroke does not. Close each contour before
      // the next move/end so glyph edges aren't missing from the outline.
      const closed: typeof path.commands = [];
      let open = false;
      for (const command of path.commands) {
        if (command.type === "M") { if (open) closed.push({ type: "Z" }); open = true; }
        if (command.type === "Z") open = false;
        closed.push(command);
      }
      if (open) closed.push({ type: "Z" });
      path.commands = closed;
      // @types still describes v1's numeric argument; v2 accepts these options.
      // Keep original contour geometry and screen-space Y coordinates.
      const serializer = path as unknown as { toPathData(options: { decimalPlaces: number; flipY: boolean; optimize: boolean }): string };
      const data = serializer.toPathData({ decimalPlaces: 3, flipY: false, optimize: false });
      if (data.length > 4_000_000 || !/^[MLCQZmlcqz0-9., eE+\-]*$/.test(data)) throw new Error("Invalid glyph outline");
      return data;
    },
  };
}
