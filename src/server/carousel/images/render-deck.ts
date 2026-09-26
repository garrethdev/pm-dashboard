import sharp from "sharp";
import { validateTemplate } from "@/lib/carousel/template/validate";
import { planTemplateCaptions } from "@/lib/carousel/render/template-captions";
import { paintOutlinedTextLayers } from "@/lib/carousel/render/text-svg";
import { renderDeckBackgrounds } from "./render-backgrounds";
import { renderCaption } from "./render-caption";

/** In-memory captioned deck, not uploaded/persisted/approved. Requires already
 * authenticated pinned inputs, saved selections, trusted image bytes and trusted
 * licensed font bytes by template font key. Never opens a template's font.file.
 * Preflight all captions before expensive image work; never emit a partial deck.
 */
export async function renderCaptionedDeck(input: Parameters<typeof renderDeckBackgrounds>[0] & {
  roles: Readonly<Record<string, string>>; fonts: ReadonlyMap<string, Uint8Array>;
}) {
  const template = validateTemplate(input.template);
  const plans = planTemplateCaptions(template, input.roles);
  const fonts = new Map<string, Uint8Array>();
  let fontBytes = 0;
  for (const slide of plans) for (const box of slide.boxes) {
    if (!fonts.has(box.font)) {
      const bytes = input.fonts.get(box.font);
      if (!(bytes instanceof Uint8Array) || bytes.length < 12 || bytes.length > 10_000_000) throw new Error(`Missing or invalid caption font: ${box.font}`);
      fontBytes += bytes.length;
      if (fontBytes > 40_000_000) throw new Error("Deck font byte limit exceeded");
      fonts.set(box.font, Uint8Array.from(bytes));
    }
    paintOutlinedTextLayers(box.input, box.paint, fonts.get(box.font)!);
  }
  const output = template.output as { format: "png" | "jpeg"; quality?: number };
  if (output.format === "jpeg" && !Number.isInteger(output.quality)) throw new Error("JPEG quality must be an integer");
  const backgrounds = await renderDeckBackgrounds({ ...input, template });
  const slides: { n: number; format: "png" | "jpeg"; bytes: Buffer }[] = [];
  let total = 0;
  for (let index = 0; index < plans.length; index++) {
    let bytes = backgrounds.slides[index].bytes;
    // Apply sequentially to bound full-canvas layer memory and preserve box order.
    for (const box of plans[index].boxes) {
      const caption = await renderCaption(box.input, box.paint, fonts.get(box.font)!);
      bytes = await sharp(bytes).composite([{ input: caption, left: 0, top: 0 }]).png().toBuffer();
    }
    if (output.format === "jpeg") bytes = await sharp(bytes).jpeg({ quality: output.quality }).toBuffer();
    total += bytes.length;
    if (total > 100_000_000) throw new Error("Captioned deck output byte limit exceeded");
    slides.push({ n: plans[index].n, format: output.format, bytes });
  }
  return { stage: "captioned_deck" as const, persisted: false as const, approved: false as const, slides };
}
