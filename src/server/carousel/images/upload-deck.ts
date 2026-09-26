import { validateTemplate } from "@/lib/carousel/template/validate";
import { renderStoragePath } from "./storage-path";
import { uploadRenderedImage } from "./upload-render";
import type { renderCaptionedDeck } from "./render-deck";

type RenderedDeck = Awaited<ReturnType<typeof renderCaptionedDeck>>;
type Receipt = Awaited<ReturnType<typeof uploadRenderedImage>> & { n: number };

/** Preflight every slide and destination before the first external write. Only
 * output of the captioned renderer belongs here, never raw bank URLs/backgrounds.
 * The caller owns draft-version/lease authorization and persists returned receipts
 * atomically against that version. Upload success itself never approves a deck.
 */
export async function uploadCaptionedDeck(input: {
  template: unknown; rendered: RenderedDeck;
  identifiers: { carousel_id?: string; deck_key?: string };
  prefix: string;
}, config: Parameters<typeof uploadRenderedImage>[1]) {
  const template = validateTemplate(input.template);
  const output = template.output as { bucket: string; path: string; format: "png" | "jpeg" };
  if (input.rendered?.stage !== "captioned_deck" || !Array.isArray(input.rendered.slides) ||
      input.rendered.slides.length !== template.slides.length) throw new Error("Captioned deck does not match template");
  if (!config.allowedBuckets.includes(output.bucket)) throw new Error("Render bucket is not allowed");
  // Keep policy stable across awaited uploads without retaining it in receipts.
  const storage = { ...config, allowedBuckets: [...config.allowedBuckets] };
  const paths = new Set<string>(); let total = 0;
  const slides = input.rendered.slides.map((slide, index) => {
    if (slide.n !== template.slides[index].n || slide.format !== output.format ||
      !Buffer.isBuffer(slide.bytes) || !slide.bytes.length || slide.bytes.length > 20_000_000) throw new Error("Invalid captioned slide");
    const bytes = Buffer.from(slide.bytes);
    const signatureMatches = slide.format === "png"
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!signatureMatches) throw new Error("Captioned slide format mismatch");
    total += bytes.length;
    if (total > 100_000_000) throw new Error("Captioned deck byte limit exceeded");
    const path = renderStoragePath(output.path, { ...input.identifiers, n: slide.n }, input.prefix);
    if (path.length > 1024 || paths.has(path) || !(slide.format === "png" ? path.endsWith(".png") : /\.jpe?g$/.test(path))) throw new Error("Invalid or duplicate render destination");
    paths.add(path);
    return { n: slide.n, bytes, path, format: slide.format, bucket: output.bucket };
  });
  const verified: Receipt[] = [];
  for (let index = 0; index < slides.length; index++) {
    const slide = slides[index];
    try {
      const receipt = await uploadRenderedImage(slide, storage);
      verified.push({ ...receipt, n: slide.n });
    } catch {
      // The failed attempt may already have stored bytes before a readback or
      // network failure. Don't delete anything, mark it absent or publish a URL.
      // Retry using the same prefix: the per-object adapter verifies duplicates.
      return { state: "storage_incomplete" as const, databasePersisted: false as const, approved: false as const,
        verified, failedSlide: slide.n, failedSlideStorage: "unknown" as const,
        unattempted: slides.slice(index + 1).map(item => item.n), error: "A rendered slide could not be verified in storage" };
    }
  }
  return { state: "storage_verified" as const, databasePersisted: false as const, approved: false as const,
    verified, failedSlide: null, unattempted: [] as number[] };
}
