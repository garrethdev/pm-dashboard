import { validateTemplate } from "@/lib/carousel/template/validate";
import { readSavedManifest } from "@/lib/carousel/picking/manifest";
import { composeImageCells } from "./compose";

/** Lossless image backgrounds only, NOT final carousel slides. The caller must
 * supply already-fetched, trusted bytes keyed by the saved URL. There is no
 * network access, repicking, upload or approval here. PNG avoids encoding JPEG
 * twice when the caption painter is connected later.
 */
export async function renderDeckBackgrounds(input: {
  template: unknown; manifest: unknown; libraryId: string; deckId: string;
  images: ReadonlyMap<string, Buffer>;
}) {
  const template = validateTemplate(input.template);
  const manifest = readSavedManifest(input.manifest, {
    slug: template.slug, version: template.version,
    image_rules: template.image_rules as Record<string, unknown>, slides: template.slides,
  }, input.libraryId, input.deckId);
  const images = new Map<string, Buffer>();
  let total = 0;
  // Check every required asset first. Missing slide 3 is an error, not permission
  // to emit slide 4 under slide 3's filename. Snapshot bytes for stable retries.
  for (const slide of manifest.slides) for (const cell of slide.cells) {
    if (images.has(cell.public_url)) continue;
    const bytes = input.images.get(cell.public_url);
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 20_000_000) throw new Error(`Missing or invalid image bytes for slide ${slide.n}`);
    total += bytes.length;
    if (total > 80_000_000) throw new Error("Deck image byte limit exceeded");
    images.set(cell.public_url, Buffer.from(bytes));
  }
  const fit = template.fit as { exif_transpose: boolean; resample: "bicubic" | "lanczos" };
  const slides: { n: number; format: "png"; bytes: Buffer }[] = [];
  let outputBytes = 0;
  for (let index = 0; index < template.slides.length; index++) {
    const slide = template.slides[index], saved = manifest.slides[index];
    const bytes = await composeImageCells({ width: template.canvas.width, height: template.canvas.height,
      background: template.canvas.background ?? "#000000", exifTranspose: fit.exif_transpose, resample: fit.resample,
      output: { format: "png" }, cells: slide.cells.map((cell, i) => ({ ...cell, bytes: images.get(saved.cells[i].public_url)! })) });
    outputBytes += bytes.length;
    if (outputBytes > 100_000_000) throw new Error("Deck output byte limit exceeded");
    slides.push({ n: slide.n, format: "png", bytes });
  }
  return { stage: "image_backgrounds" as const, finalSlides: false as const, slides };
}
