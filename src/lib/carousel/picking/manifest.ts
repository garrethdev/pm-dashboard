import type { ImageManifest, PickingTemplate } from "./pick";
type Row = Record<string, unknown>;
function object(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid saved image manifest");
  return value as Row;
}

/** Validate saved selections against the pinned deck, not today's library.
 * Repeated images are legal for thin pools. URLs are only shape-checked here;
 * the renderer still needs a network allowlist, redirect and size protections.
 */
export function readSavedManifest(value: unknown, template: PickingTemplate, libraryId: string, deckId: string): ImageManifest {
  const row = object(value), pinned = object(row.template);
  if (row.deck_id !== deckId || row.library_id !== libraryId || pinned.slug !== template.slug || pinned.version !== template.version ||
      !Array.isArray(row.slides) || row.slides.length !== template.slides.length) throw new Error("Saved image manifest does not match pinned deck");
  const slides = row.slides.map((value, index) => {
    const slide = object(value), expected = template.slides[index];
    if (slide.n !== expected.n || !Array.isArray(slide.cells) || slide.cells.length !== expected.cells.length) throw new Error("Saved image manifest slide mismatch");
    const cells = slide.cells.map((value, cellIndex) => {
      const cell = object(value);
      if (cell.cell !== cellIndex || typeof cell.image_id !== "string" || !cell.image_id.trim() || typeof cell.public_url !== "string") throw new Error("Invalid saved image cell");
      let url: URL;
      try { url = new URL(cell.public_url); } catch { throw new Error("Invalid saved image URL"); }
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid saved image URL");
      return { cell: cellIndex, image_id: cell.image_id, public_url: cell.public_url };
    });
    return { n: expected.n, cells };
  });
  return { deck_id: deckId, library_id: libraryId, template: { slug: template.slug, version: template.version }, slides };
}
