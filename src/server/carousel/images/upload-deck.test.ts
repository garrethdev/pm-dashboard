import { beforeEach, expect, it, vi } from "vitest";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
const mock = vi.hoisted(() => vi.fn());
vi.mock("./upload-render", () => ({ uploadRenderedImage: mock }));
import { uploadCaptionedDeck } from "./upload-deck";
const config = { origin: "https://project.supabase.co", serviceKey: "test-only-secret", allowedBuckets: ["covered-eye-images"] };
function fixture() {
  const template = structuredClone(eye); Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  return { template, identifiers: { carousel_id: "CE-241" }, prefix: "scratch/run-1",
    rendered: { stage: "captioned_deck" as const, persisted: false as const, approved: false as const,
      slides: [1, 2, 3, 4, 5, 6].map(n => ({ n, format: "jpeg" as const, bytes: Buffer.from([255, 216, 255, n]) })) } };
}
beforeEach(() => {
  mock.mockReset(); mock.mockImplementation(async input => ({ bucket: input.bucket, path: input.path,
    format: input.format, sha256: "a".repeat(64), byteLength: input.bytes.length, verified: true, reused: false, attempts: 1 }));
});
it("uploads all original slide numbers and returns receipts without approval or database completion", async () => {
  const result = await uploadCaptionedDeck(fixture(), config);
  expect(result).toMatchObject({ state: "storage_verified", databasePersisted: false, approved: false, failedSlide: null, unattempted: [] });
  expect(result.verified.map(v => v.n)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(result.verified[2].path).toBe("scratch/run-1/renders/CE-241/slide_03.jpg");
  expect(JSON.stringify(result)).not.toContain(config.serviceKey);
});
it("retains earlier verified objects and reports unknown failed-slide storage without renumbering", async () => {
  mock.mockImplementationOnce(async input => ({ ...input, bytes: undefined, verified: true, sha256: "a".repeat(64) }))
    .mockRejectedValueOnce(new Error("internal credential detail"));
  const result = await uploadCaptionedDeck(fixture(), config);
  expect(result).toMatchObject({ state: "storage_incomplete", failedSlide: 2, failedSlideStorage: "unknown", unattempted: [3, 4, 5, 6], databasePersisted: false, approved: false });
  expect(result.verified.map(v => v.n)).toEqual([1]);
  expect(mock).toHaveBeenCalledTimes(2); expect(JSON.stringify(result)).not.toContain("credential detail");
});
it("reuses the same destinations on retry instead of creating new paths", async () => {
  const input = fixture(); await uploadCaptionedDeck(input, config);
  const first = mock.mock.calls.map(([slide]) => slide.path); mock.mockClear();
  await uploadCaptionedDeck(input, config);
  expect(mock.mock.calls.map(([slide]) => slide.path)).toEqual(first);
});
it("preflights a corrupt last slide before uploading the first", async () => {
  const input = fixture(); input.rendered.slides[5].bytes = Buffer.from("not an image");
  await expect(uploadCaptionedDeck(input, config)).rejects.toThrow("format mismatch"); expect(mock).not.toHaveBeenCalled();
});
it("rejects absent, duplicate and reordered slide numbers before uploads", async () => {
  for (const variant of ["absent", "duplicate", "reordered"]) {
    const input = fixture();
    if (variant === "absent") input.rendered.slides.pop();
    if (variant === "duplicate") input.rendered.slides[5].n = 5;
    if (variant === "reordered") input.rendered.slides.reverse();
    await expect(uploadCaptionedDeck(input, config)).rejects.toThrow();
  }
  expect(mock).not.toHaveBeenCalled();
});
it("rejects colliding destinations, mismatched extensions and disallowed buckets", async () => {
  const input = fixture(); input.template.output.path = "one.jpg";
  await expect(uploadCaptionedDeck(input, config)).rejects.toThrow("duplicate");
  input.template.output.path = "slide{n}.png";
  await expect(uploadCaptionedDeck(input, config)).rejects.toThrow("destination");
  await expect(uploadCaptionedDeck(fixture(), { ...config, allowedBuckets: [] })).rejects.toThrow("not allowed");
  expect(mock).not.toHaveBeenCalled();
});
it("snapshots later slide bytes before the first asynchronous upload", async () => {
  const input = fixture();
  mock.mockImplementationOnce(async slide => { input.rendered.slides[5].bytes.fill(0); return { path: slide.path, verified: true }; });
  await uploadCaptionedDeck(input, config);
  expect(mock.mock.calls[5][0].bytes).toEqual(Buffer.from([255, 216, 255, 6]));
});
