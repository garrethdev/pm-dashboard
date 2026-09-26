import sharp, { type OverlayOptions } from "sharp";
export interface ImageCell { x: number; y: number; w: number; h: number; bytes: Buffer }
export interface Composition {
  width: number;
  height: number;
  background: string;
  cells: ImageCell[];
  exifTranspose: boolean;
  resample: "bicubic" | "lanczos";
  output: { format: "png" } | { format: "jpeg"; quality: number };
}

/** DEV-05 CPU-only composition. Accept bytes, never paths/URLs or SVG documents.
 * The future fetcher owns host/redirect policy. Decode sequentially to bound
 * peak memory; reject corrupt/animated/oversized inputs rather than skip a cell.
 * No upload, persistence, text, or approval is performed here.
 */
export async function composeImageCells(input: Composition): Promise<Buffer> {
  const positiveInt = (n: number) => Number.isSafeInteger(n) && n > 0;
  if (!positiveInt(input.width) || !positiveInt(input.height) || input.width * input.height > 16_000_000 ||
      !/^#[0-9a-f]{6}$/i.test(input.background) || !Array.isArray(input.cells) || input.cells.length < 1 || input.cells.length > 16 ||
      typeof input.exifTranspose !== "boolean" || !["bicubic", "lanczos"].includes(input.resample) ||
      !["png", "jpeg"].includes(input.output.format) || input.output.format === "jpeg" && (!Number.isInteger(input.output.quality) || input.output.quality < 1 || input.output.quality > 100)) throw new Error("Invalid image composition");
  let totalBytes = 0;
  for (const cell of input.cells) {
    if (!Number.isSafeInteger(cell.x) || !Number.isSafeInteger(cell.y) || cell.x < 0 || cell.y < 0 ||
        !positiveInt(cell.w) || !positiveInt(cell.h) || cell.x + cell.w > input.width || cell.y + cell.h > input.height ||
        !Buffer.isBuffer(cell.bytes) || !cell.bytes.length || cell.bytes.length > 20_000_000) throw new Error("Invalid image cell");
    totalBytes += cell.bytes.length;
  }
  if (totalBytes > 80_000_000) throw new Error("Image composition byte limit exceeded");
  const overlays: OverlayOptions[] = [];
  for (const cell of input.cells) {
    try {
      const bytes = cell.bytes;
      const rasterSignature = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ||
        bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
      if (!rasterSignature) throw new Error("Unsupported raster input");
      let image = sharp(cell.bytes, { limitInputPixels: 40_000_000, failOn: "warning" });
      const metadata = await image.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) !== 1) throw new Error("Unsupported raster input");
      if (input.exifTranspose) image = image.autoOrient();
      const fitted = await image.resize(cell.w, cell.h, { fit: "cover", position: "centre", kernel: input.resample === "lanczos" ? "lanczos3" : "cubic" })
        .toColourspace("srgb").png().toBuffer();
      overlays.push({ input: fitted, left: cell.x, top: cell.y, blend: "over" });
    } catch { throw new Error("Image cell could not be decoded or fitted"); }
  }
  // Sharp strips metadata by default. Keep manifest order, square corners and
  // exact cell coordinates; no border, gap, rounded mask or silent renumbering.
  const composed = sharp({ create: { width: input.width, height: input.height, channels: 3, background: input.background } }).composite(overlays);
  return input.output.format === "png" ? composed.png().toBuffer() : composed.jpeg({ quality: input.output.quality }).toBuffer();
}
