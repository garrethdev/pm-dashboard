import sharp, { type OverlayOptions } from "sharp";
import { paintOutlinedTextLayers, type TextPaint } from "@/lib/carousel/render/text-svg";
import type { TextLayoutInput } from "@/lib/carousel/render/text-layout";

/** Transparent caption PNG only, not a final slide or approval. No arbitrary
 * SVG/path/URL input is accepted: both layers are generated from validated text
 * and caller-supplied trusted licensed font bytes. Soft shadow is rasterized and
 * blurred separately before the crisp stroke/fill pass. */
export async function renderCaption(input: Omit<TextLayoutInput, "font">,
  paint: Omit<TextPaint, "fontFamily">, fontBytes: Uint8Array): Promise<Buffer> {
  const { width, height } = input.canvas;
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0) || width * height > 16_000_000) throw new Error("Invalid caption canvas");
  const layers = paintOutlinedTextLayers(input, paint, fontBytes);
  const overlays: OverlayOptions[] = [];
  const raster = (svg: string) => {
    if (Buffer.byteLength(svg) > 8_000_000) throw new Error("Caption outline byte limit exceeded");
    return sharp(Buffer.from(svg), { limitInputPixels: 16_000_000, failOn: "warning" });
  };
  if (layers.shadow) {
    let shadow = raster(layers.shadow.svg);
    if (layers.shadow.blurSigma > 0) shadow = shadow.blur(layers.shadow.blurSigma);
    overlays.push({ input: await shadow.png().toBuffer(), left: 0, top: 0 });
  }
  overlays.push({ input: await raster(layers.foreground).png().toBuffer(), left: 0, top: 0 });
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(overlays).png().toBuffer();
}
