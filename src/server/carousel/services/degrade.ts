/**
 * The degrade pass (Degrade Pass Wiring Handover, Garreth, 2026-10-12).
 * Every picture an image model makes is re-made as a phone-camera JPEG
 * before it is stored or shown; nothing downstream ever receives the raw
 * render. Decoding to pixels and saving fresh drops the file's metadata:
 * EXIF, XMP, ICC, IPTC, text labels and the C2PA manifest. An invisible
 * pixel watermark such as SynthID is not proven removed, so a clean
 * detector result is a detector result, not proof.
 *
 * The steps and numbers are character-6/after-review/degrade.py's, in its
 * order. The result looks the same but is not byte-identical to the
 * script's: the random grain, the resampling and the JPEG encoder are
 * sharp's, not Pillow's and NumPy's. A given picture and seed always give
 * the same file, so a retry is safe. Change a number only as a deliberate
 * decision for the whole set.
 */
import sharp from "sharp";

export const DEGRADE = {
  scale: 0.72, // Lanczos down, bilinear back up: a 12 MP front camera's softness
  lumaSigma: 5.5, // grain, weighted by (1.6 − brightness) so shadows get more
  shadowLift: 1.6,
  chromaSigma: 2.0,
  unsharp: { radius: 1.2, percent: 45, threshold: 2 }, // phone sharpening halos
  quality: 68, // 4:2:0 colour, optimised coding
} as const;

// The handover's 300 KB to 1.2 MB at 1856 × 2304, as KB per megapixel,
// widened so a plain picture's honest result is not refused. Far below means
// the input was already a small JPEG; far above means the save options were lost.
const KB_PER_MP = { min: 50, max: 350 };

export interface Degraded {
  bytes: Buffer;
  width: number;
  height: number;
}

/**
 * The pass. `seed` is the id of the picture being made, so a re-run gives
 * the same file. The result has been checked by `assertDegraded`; a picture
 * that fails a check throws, and nothing is stored.
 */
export async function degrade(input: Buffer, seed: string): Promise<Degraded> {
  // Turned the right way up first, because the orientation tag goes with the rest.
  const src = await sharp(input, { failOn: "error" }).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = src.info;
  const rgb = toRgb(src.data, src.info.channels, w * h);
  const raw = (width: number, height: number) => ({ raw: { width, height, channels: 3 as const } });

  const sw = Math.trunc(w * DEGRADE.scale);
  const sh = Math.trunc(h * DEGRADE.scale);
  const small = await sharp(rgb, raw(w, h)).resize(sw, sh, { fit: "fill", kernel: "lanczos3" }).raw().toBuffer();
  const soft = await sharp(small, raw(sw, sh)).resize(w, h, { fit: "fill", kernel: "linear" }).raw().toBuffer();

  // Grain, in the script's order: all the luminance noise, then the colour noise.
  const n = w * h;
  const normal = gaussian(crc32(seed));
  const luma = new Float32Array(n);
  for (let p = 0; p < n; p++) luma[p] = normal() * DEGRADE.lumaSigma;
  const grained = Buffer.alloc(n * 3);
  for (let p = 0, i = 0; p < n; p++, i += 3) {
    const bright = (soft[i] + soft[i + 1] + soft[i + 2]) / 3 / 255;
    const l = luma[p] * (DEGRADE.shadowLift - Math.min(1, Math.max(0, bright)));
    for (let c = 0; c < 3; c++) {
      const v = soft[i + c] + l + normal() * DEGRADE.chromaSigma;
      grained[i + c] = v <= 0 ? 0 : v >= 255 ? 255 : Math.trunc(v);
    }
  }

  // Pillow's UnsharpMask: the original plus percent of its difference from a
  // blurred copy, rounded toward zero, where that difference reaches the threshold.
  const { radius, percent, threshold } = DEGRADE.unsharp;
  const blurred = await sharp(grained, raw(w, h)).blur(radius).raw().toBuffer();
  const sharpened = Buffer.alloc(n * 3);
  for (let i = 0; i < n * 3; i++) {
    const diff = grained[i] - blurred[i];
    const v = Math.abs(diff) >= threshold ? grained[i] + Math.trunc((diff * percent) / 100) : grained[i];
    sharpened[i] = v <= 0 ? 0 : v >= 255 ? 255 : v;
  }

  // Nothing is asked to be kept, which is what leaves the metadata behind.
  const bytes = await sharp(sharpened, raw(w, h)).jpeg({ quality: DEGRADE.quality, chromaSubsampling: "4:2:0", optimiseCoding: true }).toBuffer();
  assertDegraded(bytes, { width: w, height: h });
  return { bytes, width: w, height: h };
}

/**
 * The checks on every result, which fail the step rather than log: a JPEG
 * the pass wrote (its quality-68 tables), the same width and height as the
 * picture it was made from, no metadata of any kind, and a believable size.
 */
export function assertDegraded(bytes: Buffer, expect?: { width: number; height: number }): { width: number; height: number } {
  const jpeg = readJpeg(bytes);
  if (!jpeg) throw new Error("The phone-quality pass did not produce a JPEG");
  if (jpeg.metadata.length) throw new Error(`The phone-quality pass left metadata in the file (${jpeg.metadata.join(", ")})`);
  if (!sameTable(jpeg.lumaTable, LUMA_Q68)) throw new Error("The picture was not made by the phone-quality pass");
  if (expect && (jpeg.width !== expect.width || jpeg.height !== expect.height)) throw new Error("The phone-quality pass changed the picture's size");
  const kbPerMp = bytes.length / 1024 / ((jpeg.width * jpeg.height) / 1e6);
  if (kbPerMp < KB_PER_MP.min || kbPerMp > KB_PER_MP.max) throw new Error(`The phone-quality pass made a file of an unexpected size (${Math.round(kbPerMp)} KB per megapixel)`);
  return { width: jpeg.width, height: jpeg.height };
}

/**
 * The metadata check alone, for a picture saved some other way (an upload,
 * a black and white copy, a cut-out): no EXIF, XMP, ICC, IPTC, C2PA,
 * comment or text label. Throws when there is one.
 */
export function assertNoMetadata(bytes: Buffer): void {
  const found = readJpeg(bytes)?.metadata ?? readPngMetadata(bytes);
  if (found === null) throw new Error("Not a JPEG or PNG");
  if (found.length) throw new Error(`The saved picture still carries metadata (${found.join(", ")})`);
}

// ── Reading a file's blocks ─────────────────────────────────────────────

const APP_NAMES: Record<number, string> = { 0xe1: "EXIF or XMP", 0xe2: "ICC", 0xeb: "C2PA", 0xed: "IPTC", 0xfe: "comment" };

/** A JPEG's size, its first quantisation table in natural order, and every block that is not picture. */
function readJpeg(b: Buffer): { width: number; height: number; lumaTable: number[] | null; metadata: string[] } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const metadata = new Set<string>();
  let width = 0, height = 0, lumaTable: number[] | null = null;
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0xd9 || m === 0xda) break;
    const len = b.readUInt16BE(i + 2);
    const seg = b.subarray(i + 4, i + 2 + len);
    if (m === 0xe0) {
      if (seg.subarray(0, 5).toString("latin1") !== "JFIF\0") metadata.add("APP0");
    } else if ((m >= 0xe1 && m <= 0xef) || m === 0xfe) {
      metadata.add(APP_NAMES[m] ?? `APP${m - 0xe0}`);
    } else if (m === 0xdb && !lumaTable && seg[0] === 0) {
      // Table 0 at 8-bit precision, stored in zigzag order.
      lumaTable = new Array(64);
      for (let k = 0; k < 64; k++) lumaTable[ZIGZAG[k]] = seg[1 + k];
    } else if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      height = seg.readUInt16BE(1);
      width = seg.readUInt16BE(3);
    }
    i += 2 + len;
  }
  return { width, height, lumaTable, metadata: [...metadata] };
}

const PNG_PICTURE = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "pHYs", "gAMA", "cHRM", "sRGB", "sBIT", "bKGD"]);
const PNG_NAMES: Record<string, string> = { eXIf: "EXIF", iCCP: "ICC", caBX: "C2PA", iTXt: "text label", tEXt: "text label", zTXt: "text label" };

function readPngMetadata(b: Buffer): string[] | null {
  if (b.length < 8 || b.readUInt32BE(0) !== 0x89504e47) return null;
  const found = new Set<string>();
  for (let i = 8; i + 8 <= b.length; ) {
    const len = b.readUInt32BE(i);
    const type = b.toString("latin1", i + 4, i + 8);
    if (!PNG_PICTURE.has(type)) found.add(PNG_NAMES[type] ?? type);
    i += 12 + len;
  }
  return [...found];
}

// ── The quality-68 fingerprint ──────────────────────────────────────────

// The JPEG standard's luminance table (natural order), scaled to a quality as
// libjpeg does. Pillow and sharp both use it, so quality 68 always gives this.
const BASE_LUMA = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
const ZIGZAG = [0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63];
const scaled = (q: number) => BASE_LUMA.map((v) => Math.min(255, Math.max(1, Math.floor((v * (q < 50 ? 5000 / q : 200 - 2 * q) + 50) / 100))));
const LUMA_Q68 = scaled(DEGRADE.quality);
const sameTable = (a: number[] | null, b: number[]) => !!a && a.length === b.length && a.every((v, k) => v === b[k]);

// ── Pixels and the seeded grain ─────────────────────────────────────────

function toRgb(data: Buffer, channels: number, n: number): Buffer {
  if (channels === 3) return data;
  const out = Buffer.alloc(n * 3);
  for (let p = 0; p < n; p++) out[p * 3] = out[p * 3 + 1] = out[p * 3 + 2] = data[p * channels];
  return out;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** zlib's crc32, which the handover uses to turn a seed into a number. */
export function crc32(text: string): number {
  let c = 0xffffffff;
  for (const byte of Buffer.from(text, "utf8")) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Standard normal numbers from a seed: xoshiro128** for the uniforms, Box–Muller for the shape. */
function gaussian(seed: number): () => number {
  let x = seed >>> 0;
  const split = () => {
    x = (x + 0x9e3779b9) >>> 0;
    let z = x;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
  let a = split(), b = split(), c = split(), d = split();
  const uniform = () => {
    const r = Math.imul(rotl(Math.imul(b, 5) >>> 0, 7), 9) >>> 0;
    const t = (b << 9) >>> 0;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = rotl(d, 11);
    return (r + 0.5) / 4294967296;
  };
  let spare: number | null = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    const r = Math.sqrt(-2 * Math.log(uniform()));
    const t = 2 * Math.PI * uniform();
    spare = r * Math.sin(t);
    return r * Math.cos(t);
  };
}

const rotl = (v: number, k: number) => ((v << k) | (v >>> (32 - k))) >>> 0;
