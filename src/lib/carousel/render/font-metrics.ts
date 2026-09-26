import { create, type Font } from "fontkit";

/** Parse trusted, licensed static font bytes. No filesystem/network lookup and
 * no operating-system font fallback. Variable/color-emoji font support is not
 * implied by this text-metrics adapter; those need their own verified pipeline.
 * Fontkit handles Inter's GSUB tables unsupported by opentype.js. Measurement
 * and painting share shaping, including glyph offsets and kerning.
 */
export function loadFontMetrics(bytes: Uint8Array) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 12 || bytes.byteLength > 10_000_000) throw new Error("Invalid font data size");
  let font: Font;
  try {
    const parsed = create(Buffer.from(bytes));
    if (!("layout" in parsed)) throw new Error("Font collections are unsupported");
    font = parsed;
  }
  catch { throw new Error("Font data could not be parsed"); }
  if (!Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0 || !Number.isFinite(font.ascent) || font.ascent <= 0 ||
      Object.keys(font.variationAxes).length) throw new Error("A static font with valid ascender metrics is required");
  function shape(text: string, size: number) {
      if (typeof text !== "string" || text.length > 20_000 || !Number.isFinite(size) || size <= 0 || size > 4096) throw new Error("Invalid font measurement input");
      for (const character of text) {
        if (!font.hasGlyphForCodePoint(character.codePointAt(0)!)) throw new Error("Selected font does not contain a required glyph");
      }
      try { return font.layout(text); }
      catch { throw new Error("Selected font could not shape the caption"); }
  }
  function measure(text: string, size: number) {
      const width = shape(text, size).advanceWidth * size / font.unitsPerEm;
      if (!Number.isFinite(width) || width < 0) throw new Error("Invalid font advance width");
      return width;
  }
  return {
    ascender: font.ascent, unitsPerEm: font.unitsPerEm, measure,
    /** Outline the same shaped/kerning-enabled run used by measurement.
     * Only generated path commands leave this adapter, never font metadata. */
    outline(text: string, size: number, x: number, baseline: number) {
      const run = shape(text, size), scale = size / font.unitsPerEm;
      if (![x, baseline].every(n => Number.isFinite(n) && Math.abs(n) <= 1_000_000)) throw new Error("Invalid glyph position");
      let penX = x, penY = baseline, data = "";
      for (let i = 0; i < run.glyphs.length; i++) {
        const position = run.positions[i];
        if (![position.xAdvance, position.yAdvance, position.xOffset, position.yOffset].every(Number.isFinite)) throw new Error("Invalid glyph metrics");
        // Y-up font space becomes Y-down screen space. transform creates a new
        // path, so repeated glyphs never mutate the cached font geometry.
        data += run.glyphs[i].path.transform(scale, 0, 0, -scale,
          penX + position.xOffset * scale, penY - position.yOffset * scale).toSVG();
        if (data.length > 4_000_000) throw new Error("Invalid glyph outline");
        penX += position.xAdvance * scale; penY -= position.yAdvance * scale;
      }
      if (data.length > 4_000_000 || !/^[MLCQZmlcqz0-9., eE+\-]*$/.test(data)) throw new Error("Invalid glyph outline");
      return data;
    },
  };
}
