import { validateTemplate } from "@/lib/carousel/template/validate";
import { readSavedManifest } from "@/lib/carousel/picking/manifest";
import { planTemplateCaptions } from "@/lib/carousel/render/template-captions";
import { paintOutlinedTextLayers } from "@/lib/carousel/render/text-svg";
import { loadTemplateCaptionFonts } from "./fonts";
import { fetchDeckImages } from "./fetch-deck-images";
import { renderCaptionedDeck } from "./render-deck";

/** Internal render operation for an authorized, persisted selection/copy snapshot.
 * The caller must load the pinned revision and check ownership/lease; accepting a
 * manifest here does not establish that it is persisted or authorized. Origins
 * must come from server policy, never template/user input. No repicking, upload,
 * database writes or approval happen in this operation.
 */
export async function renderSavedDeck(input: {
  template: unknown; manifest: unknown; deckId: string; libraryId: string;
  roles: Readonly<Record<string, string>>; allowedOrigins: readonly string[];
}) {
  // Capture every mutable input before disk/network awaits. A caller editing its
  // draft concurrently must not change text, image selections or network policy.
  const snapshot = structuredClone(input);
  const template = validateTemplate(snapshot.template);
  const manifest = readSavedManifest(snapshot.manifest, {
    slug: template.slug, version: template.version,
    image_rules: template.image_rules as Record<string, unknown>, slides: template.slides,
  }, snapshot.libraryId, snapshot.deckId);
  const plans = planTemplateCaptions(template, snapshot.roles);
  const output = template.output as { format: string; quality?: number };
  if (output.format === "jpeg" && !Number.isInteger(output.quality)) throw new Error("JPEG quality must be an integer");
  const fonts = await loadTemplateCaptionFonts(template);
  // Reject unsupported glyphs/emoji and paint settings before downloading any
  // selected images. The renderer rechecks its own boundary independently.
  for (const slide of plans) for (const box of slide.boxes) {
    const bytes = fonts.get(box.font);
    if (!bytes) throw new Error(`Missing caption font: ${box.font}`);
    paintOutlinedTextLayers(box.input, box.paint, bytes);
  }
  const saved = { template, manifest, deckId: snapshot.deckId, libraryId: snapshot.libraryId };
  const images = await fetchDeckImages({ ...saved, allowedOrigins: snapshot.allowedOrigins });
  return renderCaptionedDeck({ ...saved, roles: snapshot.roles, fonts, images });
}
