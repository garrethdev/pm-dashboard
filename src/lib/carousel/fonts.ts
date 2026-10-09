/**
 * The fonts a text box may use (Garreth, 2026-10-08: "the usual TikTok
 * fonts, bring down 5 to 10"). Each is an open font served by Google Fonts,
 * so the Studio and the batch page draw it in the browser, and the painter
 * names it in the picture. The `file` is the name the PNG painter will look
 * for once it exists; nothing reads it yet.
 */
export interface SlideFont {
  key: string;
  family: string;
  file: string;
  /** How Google Fonts spells it, with the weights we draw. */
  google: string;
  weights: number[];
  /** Short feel, for the picker. */
  feel: string;
}

export const SLIDE_FONTS: SlideFont[] = [
  { key: "tiktok_sans", family: "TikTok Sans", file: "TikTokSans-Bold.ttf", google: "TikTok+Sans:wght@500;700;800", weights: [500, 700, 800], feel: "TikTok's own" },
  { key: "inter", family: "Inter", file: "Inter-Bold.ttf", google: "Inter:wght@500;700;800", weights: [500, 700, 800], feel: "Plain, clean" },
  { key: "montserrat", family: "Montserrat", file: "Montserrat-Bold.ttf", google: "Montserrat:wght@500;700;800", weights: [500, 700, 800], feel: "Wide, modern" },
  { key: "poppins", family: "Poppins", file: "Poppins-Bold.ttf", google: "Poppins:wght@500;700;800", weights: [500, 700, 800], feel: "Round, friendly" },
  { key: "bebas_neue", family: "Bebas Neue", file: "BebasNeue-Regular.ttf", google: "Bebas+Neue", weights: [400], feel: "Tall capitals" },
  { key: "anton", family: "Anton", file: "Anton-Regular.ttf", google: "Anton", weights: [400], feel: "Heavy headline" },
  { key: "oswald", family: "Oswald", file: "Oswald-Bold.ttf", google: "Oswald:wght@500;700", weights: [500, 700], feel: "Narrow, strong" },
  { key: "playfair", family: "Playfair Display", file: "PlayfairDisplay-Bold.ttf", google: "Playfair+Display:wght@500;700;800", weights: [500, 700, 800], feel: "Serif, editorial" },
  { key: "caveat", family: "Caveat", file: "Caveat-Bold.ttf", google: "Caveat:wght@500;700", weights: [500, 700], feel: "Handwritten" },
  { key: "permanent_marker", family: "Permanent Marker", file: "PermanentMarker-Regular.ttf", google: "Permanent+Marker", weights: [400], feel: "Marker pen" },
];

export const DEFAULT_FONT_KEY = "inter";

export function fontByKey(key: string | undefined | null): SlideFont {
  return SLIDE_FONTS.find((f) => f.key === key) ?? SLIDE_FONTS.find((f) => f.key === DEFAULT_FONT_KEY)!;
}

export function fontByFamily(family: string | undefined | null): SlideFont | null {
  return SLIDE_FONTS.find((f) => f.family === family) ?? null;
}

/** One stylesheet with every font, for the pages that draw slides. */
export function fontStylesheetHref(): string {
  return `https://fonts.googleapis.com/css2?${SLIDE_FONTS.map((f) => `family=${f.google}`).join("&")}&display=swap`;
}

/** The nearest weight the font actually has. */
export function nearestWeight(font: SlideFont, wanted: number): number {
  return font.weights.reduce((best, w) => (Math.abs(w - wanted) < Math.abs(best - wanted) ? w : best), font.weights[0]);
}

/** The `fonts` entry a template needs for a font, by key. */
export function fontEntry(key: string): { family: string; weight: number; file: string } {
  const f = fontByKey(key);
  return { family: f.family, weight: nearestWeight(f, 700), file: f.file };
}
