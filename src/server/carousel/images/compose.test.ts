import { expect, it } from "vitest";
import sharp from "sharp";
import { composeImageCells, type Composition } from "./compose";
const raster = (background: string) => sharp({ create: { width: 30, height: 20, channels: 3, background } }).png().toBuffer();
const base: Omit<Composition, "cells"> = { width: 20, height: 20, background: "#000000", exifTranspose: true, resample: "lanczos", output: { format: "png" } };
it("really rasterizes four edge-to-edge cells in manifest order", async () => {
  const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffffff"];
  const cells = await Promise.all(colors.map(async (color, i) => ({ x: i % 2 * 10, y: Math.floor(i / 2) * 10, w: 10, h: 10, bytes: await raster(color) })));
  const result = await composeImageCells({ ...base, cells });
  const { data, info } = await sharp(result).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  expect([info.width, info.height]).toEqual([20, 20]);
  const pixel = (x: number, y: number) => [...data.subarray((y * 20 + x) * 3, (y * 20 + x) * 3 + 3)];
  expect(pixel(9, 9)).toEqual([255, 0, 0]); expect(pixel(10, 9)).toEqual([0, 255, 0]);
  expect(pixel(9, 10)).toEqual([0, 0, 255]); expect(pixel(10, 10)).toEqual([255, 255, 255]);
});
it("encodes a fitted JPEG with exact canvas dimensions and stripped metadata", async () => {
  const result = await composeImageCells({ ...base, output: { format: "jpeg", quality: 92 }, cells: [{ x: 0, y: 0, w: 20, h: 20, bytes: await raster("#ff0000") }] });
  const metadata = await sharp(result).metadata();
  expect(metadata).toMatchObject({ format: "jpeg", width: 20, height: 20 });
  expect(metadata.exif).toBeUndefined();
});
it.each([Buffer.from("broken"), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>')])("rejects corrupt/non-raster content without skipping the cell", async bytes => {
  await expect(composeImageCells({ ...base, cells: [{ x: 0, y: 0, w: 20, h: 20, bytes }] })).rejects.toThrow("could not be decoded");
});
it("rejects out-of-bounds cells and unbounded canvases", async () => {
  const cell = { x: 1, y: 0, w: 20, h: 20, bytes: await raster("#ff0000") };
  await expect(composeImageCells({ ...base, cells: [cell] })).rejects.toThrow("Invalid image cell");
  await expect(composeImageCells({ ...base, width: 100000, height: 100000, cells: [] })).rejects.toThrow("Invalid image composition");
});
