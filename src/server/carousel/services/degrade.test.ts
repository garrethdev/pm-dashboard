import zlib from "node:zlib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { assertDegraded, assertNoMetadata, crc32, degrade } from "./degrade";

// A stand-in for a render: a soft gradient, like skin and a wall, at 4:5.
async function render(width = 480, height = 600): Promise<{ png: Buffer; raw: Buffer }> {
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      raw[i] = 90 + Math.round((150 * x) / width);
      raw[i + 1] = 60 + Math.round((120 * y) / height);
      raw[i + 2] = 50 + Math.round(40 * Math.sin(x / 23) * Math.cos(y / 31) + 40);
    }
  return { png: await sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer(), raw };
}

/** A PNG chunk, as an image model would add one. */
function chunk(type: string, data: string): Buffer {
  const body = Buffer.concat([Buffer.from(type, "latin1"), Buffer.from(data, "latin1")]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(zlib.crc32(body), 8 + data.length);
  return out;
}

/** The render with a C2PA manifest box and a text label planted after its header. */
async function labelledPng(): Promise<Buffer> {
  const { png } = await render();
  return Buffer.concat([png.subarray(0, 33), chunk("caBX", "jumbc2pa manifest"), chunk("tEXt", 'Artist\0{"Label":"1"}'), png.subarray(33)]);
}

/** A JPEG with EXIF and an ICC profile, plus a planted C2PA (APP11) block. */
async function labelledJpeg(): Promise<Buffer> {
  const { png } = await render();
  const jpg = await sharp(png).jpeg({ quality: 95 }).withMetadata({ exif: { IFD0: { Software: "An image model" } } }).toBuffer();
  const payload = Buffer.from("JP\0\x01\0\0\0\x01jumbc2pa manifest", "latin1");
  const app11 = Buffer.concat([Buffer.from([0xff, 0xeb, 0, payload.length + 2]), payload]);
  return Buffer.concat([jpg.subarray(0, 2), app11, jpg.subarray(2)]);
}

describe("the degrade pass", () => {
  it("returns a JPEG of the same size with no metadata, from a labelled PNG", async () => {
    const input = await labelledPng();
    expect(() => assertNoMetadata(input)).toThrow(/C2PA/);
    const out = await degrade(input, "seed-a");
    expect(out.bytes.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect([out.width, out.height]).toEqual([480, 600]);
    expect(() => assertNoMetadata(out.bytes)).not.toThrow();
    expect(out.bytes.includes("c2pa")).toBe(false);
    expect(out.bytes.includes("Label")).toBe(false);
  });
  it("drops EXIF, ICC and C2PA from a JPEG", async () => {
    const input = await labelledJpeg();
    expect(() => assertNoMetadata(input)).toThrow();
    const out = await degrade(input, "seed-a");
    expect(() => assertNoMetadata(out.bytes)).not.toThrow();
    expect(out.bytes.includes("An image model")).toBe(false);
  });
  it("gives the same file for the same seed and a different one for another", async () => {
    const { png } = await render();
    const [a, b, c] = await Promise.all([degrade(png, "seed-a"), degrade(png, "seed-a"), degrade(png, "seed-b")]);
    expect(a.bytes.equals(b.bytes)).toBe(true);
    expect(a.bytes.equals(c.bytes)).toBe(false);
  });
  it("adds grain: the result is not a plain re-save", async () => {
    const { png, raw } = await render();
    const out = await sharp((await degrade(png, "seed-a")).bytes).raw().toBuffer();
    let moved = 0;
    for (let i = 0; i < raw.length; i++) if (Math.abs(out[i] - raw[i]) > 2) moved++;
    expect(moved / raw.length).toBeGreaterThan(0.3);
  });
  it("takes a picture with transparency or in grey", async () => {
    const { png } = await render();
    const rgba = await sharp(png).ensureAlpha(0.5).png().toBuffer();
    const grey = await sharp(png).greyscale().png().toBuffer();
    for (const input of [rgba, grey]) {
      const out = await degrade(input, "seed-a");
      expect((await sharp(out.bytes).metadata()).channels).toBe(3);
    }
  });
});

describe("the checks on a degraded file", () => {
  it("pass the pass's own output", async () => {
    const out = await degrade((await render()).png, "seed-a");
    expect(assertDegraded(out.bytes, { width: 480, height: 600 })).toEqual({ width: 480, height: 600 });
  });
  it("refuse a plain re-save, like the four shipped files saved at quality 90", async () => {
    const plain = await sharp((await render()).png).jpeg({ quality: 90 }).toBuffer();
    expect(() => assertDegraded(plain)).toThrow(/not made by the phone-quality pass/);
  });
  it("refuse a degraded file that has picked up metadata", async () => {
    const out = await degrade((await render()).png, "seed-a");
    const tagged = await sharp(out.bytes).withMetadata({ exif: { IFD0: { Software: "An editor" } } }).jpeg({ quality: 68, chromaSubsampling: "4:2:0" }).toBuffer();
    expect(() => assertDegraded(tagged)).toThrow(/metadata/);
  });
  it("refuse a changed size", async () => {
    const out = await degrade((await render()).png, "seed-a");
    expect(() => assertDegraded(out.bytes, { width: 481, height: 600 })).toThrow(/size/);
  });
  it("let a plain sharp save through the metadata check", async () => {
    const { png } = await render();
    for (const saved of [await sharp(png).jpeg({ quality: 90 }).toBuffer(), await sharp(png).png().toBuffer()]) expect(() => assertNoMetadata(saved)).not.toThrow();
  });
});

describe("the seed", () => {
  it("is turned into a number the way zlib does", () => {
    for (const s of ["", "seed-a", "0b9a7c1e-3f2d-4e5a-9b8c-7d6e5f4a3b2c", "carousel_images:126"]) expect(crc32(s)).toBe(zlib.crc32(s));
  });
});
