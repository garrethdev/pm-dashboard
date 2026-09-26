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
  return {
    ascender: font.ascender, unitsPerEm: font.unitsPerEm,
    measure(text: string, size: number) {
      if (typeof text !== "string" || text.length > 20_000 || !Number.isFinite(size) || size <= 0 || size > 4096) throw new Error("Invalid font measurement input");
      for (const character of text) {
        if (font.charToGlyphIndex(character) === 0) throw new Error("Selected font does not contain a required glyph");
      }
      const width = font.getAdvanceWidth(text, size, { kerning: true });
      if (!Number.isFinite(width) || width < 0) throw new Error("Invalid font advance width");
      return width;
    },
  };
}
