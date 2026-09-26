import { validateTemplate } from "@/lib/carousel/template/validate";
import { readSavedManifest } from "@/lib/carousel/picking/manifest";
import { fetchImageBytes } from "./fetch-image";

/** Fetch only validated saved selections; never repick an unavailable image.
 * Sequential requests bound memory/network concurrency. Repeated saved URLs are
 * downloaded once per invocation, without a cross-user or stale global cache.
 * Caller supplies a server-owned allowlist, not values derived from the manifest.
 */
export async function fetchDeckImages(input: {
  template: unknown; manifest: unknown; libraryId: string; deckId: string;
  allowedOrigins: readonly string[];
}) {
  const template = validateTemplate(input.template);
  const manifest = readSavedManifest(input.manifest, {
    slug: template.slug, version: template.version,
    image_rules: template.image_rules as Record<string, unknown>, slides: template.slides,
  }, input.libraryId, input.deckId);
  const allowedOrigins = [...input.allowedOrigins];
  const result = new Map<string, Buffer>();
  let total = 0;
  for (const slide of manifest.slides) for (const cell of slide.cells) {
    if (result.has(cell.public_url)) continue;
    if (total >= 80_000_000) throw new Error("Deck image byte limit exceeded");
    const bytes = await fetchImageBytes(cell.public_url, { allowedOrigins, maxBytes: Math.min(20_000_000, 80_000_000 - total) });
    total += bytes.length;
    result.set(cell.public_url, bytes);
  }
  return result;
}
