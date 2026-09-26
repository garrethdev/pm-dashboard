import { safeWebUrl } from "./presentation";

type Row = Record<string, unknown>;

/** Discovery media is an ordered source list, not a substitute for missing beats.
 * Only align a complete, unambiguous list with contiguous one-based slide rows.
 * Never filter bad URLs first: that would shift every subsequent slide position.
 */
export function attachSlideMedia(slides: Row[], evidence: Row | undefined): Row[] {
  const urls = evidence?.media_urls;
  if (!slides.length || !Array.isArray(urls) || urls.length !== slides.length ||
      slides.some((slide, index) => slide.position !== index + 1)) return slides;
  const safe = urls.map(safeWebUrl);
  if (safe.some(url => !url) || new Set(safe).size !== safe.length) return slides;
  return slides.map((slide, index) => ({ ...slide, media: { url: safe[index] },
    media_source: { relation: "source_discovery_evidence", id: evidence?.id ?? null, position: index + 1 } }));
}
