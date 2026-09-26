import { afterEach, expect, it, vi } from "vitest";
import { uploadRenderedImage } from "./upload-render";
import { renderStoragePath } from "./storage-path";
const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const input = () => ({ bucket: "scratch", path: "run/deck/slide_03.png", format: "png" as const, bytes: Buffer.from(bytes) });
const config = { origin: "https://project.supabase.co", serviceKey: "test-only-secret", allowedBuckets: ["scratch"] };
function deps() { return { fetch: vi.fn<typeof fetch>(), sleep: vi.fn(async () => {}) }; }
const readback = () => new Response(new Uint8Array(bytes));
afterEach(() => vi.useRealTimers());
it("uploads without overwrite and verifies the authenticated readback hash", async () => {
  const io = deps(); io.fetch.mockResolvedValueOnce(new Response("ok")).mockResolvedValueOnce(readback());
  const result = await uploadRenderedImage(input(), config, io);
  expect(result).toMatchObject({ verified: true, reused: false, attempts: 1, path: "run/deck/slide_03.png", byteLength: bytes.length });
  expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(io.fetch.mock.calls[0][1]).toMatchObject({ method: "POST", redirect: "error", headers: { "x-upsert": "false", "Content-Type": "image/png" } });
  expect(io.fetch.mock.calls[1][0]).toBe("https://project.supabase.co/storage/v1/object/scratch/run/deck/slide_03.png");
  expect(result).not.toHaveProperty("publicUrl"); expect(result).not.toHaveProperty("approved");
});
it.each([400, 409])("treats duplicate %s as reusable only after matching bytes", async status => {
  const io = deps(); io.fetch.mockResolvedValueOnce(new Response(null, { status })).mockResolvedValueOnce(readback());
  expect(await uploadRenderedImage(input(), config, io)).toMatchObject({ reused: true, verified: true });
});
it("does not overwrite a different existing object or retry a hash mismatch", async () => {
  const io = deps(); io.fetch.mockResolvedValueOnce(new Response(null, { status: 409 })).mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));
  await expect(uploadRenderedImage(input(), config, io)).rejects.toThrow("verification failed");
  expect(io.fetch).toHaveBeenCalledTimes(2); expect(io.sleep).not.toHaveBeenCalled();
});
it("rejects equal-size but different content and oversized readbacks", async () => {
  for (const length of [bytes.length, bytes.length + 1]) {
    const io = deps(); io.fetch.mockResolvedValueOnce(new Response("ok"))
      .mockResolvedValueOnce(new Response(new Uint8Array(length)));
    await expect(uploadRenderedImage(input(), config, io)).rejects.toThrow("verification failed");
    expect(io.fetch).toHaveBeenCalledTimes(2);
  }
});
it("retries transient failures three times with bounded backoff", async () => {
  const io = deps(); io.fetch.mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(null, { status: 429 })).mockResolvedValueOnce(new Response("ok")).mockResolvedValueOnce(readback());
  expect(await uploadRenderedImage(input(), config, io)).toMatchObject({ attempts: 3 });
  expect(io.sleep.mock.calls).toEqual([[250], [500]]);
});
it("recovers an ambiguous upload failure through duplicate readback", async () => {
  const io = deps(); io.fetch.mockRejectedValueOnce(new Error("secret internal transport detail"))
    .mockResolvedValueOnce(new Response(null, { status: 400 })).mockResolvedValueOnce(readback());
  expect(await uploadRenderedImage(input(), config, io)).toMatchObject({ attempts: 2, reused: true });
});
it.each([301, 403])("does not retry permanent upload status %s", async status => {
  const io = deps(); io.fetch.mockResolvedValueOnce(new Response(null, { status }));
  await expect(uploadRenderedImage(input(), config, io)).rejects.toThrow("verification failed");
  expect(io.fetch).toHaveBeenCalledTimes(1);
});
it("stops after three failing attempts and sanitizes service errors", async () => {
  const io = deps(); io.fetch.mockRejectedValue(new Error(config.serviceKey));
  await expect(uploadRenderedImage(input(), config, io)).rejects.toThrow("Rendered image storage verification failed");
  expect(io.fetch).toHaveBeenCalledTimes(3);
});
it("bounds a stalled fetch even if the transport ignores abort", async () => {
  vi.useFakeTimers(); const io = deps(); io.fetch.mockImplementation(() => new Promise(() => {}));
  const outcome = expect(uploadRenderedImage(input(), config, io)).rejects.toThrow("verification failed");
  await vi.advanceTimersByTimeAsync(60_001); await outcome;
  expect(io.fetch).toHaveBeenCalledTimes(3);
  expect(io.fetch.mock.calls.every(([, options]) => options?.signal?.aborted)).toBe(true);
});
it("snapshots bytes before asynchronous transfer", async () => {
  const original = input(), io = deps();
  io.fetch.mockImplementationOnce(async () => { original.bytes.fill(0); return new Response("ok"); }).mockResolvedValueOnce(readback());
  expect(await uploadRenderedImage(original, config, io)).toMatchObject({ verified: true });
});
it.each(["http://project.supabase.co", "https://project.supabase.co.evil.test", "https://user:pass@project.supabase.co", "https://project.supabase.co/path"])("rejects unsafe credential destination %s", async origin => {
  const io = deps(); await expect(uploadRenderedImage(input(), { ...config, origin }, io)).rejects.toThrow("configuration");
  expect(io.fetch).not.toHaveBeenCalled();
});
it("rejects bucket escapes, path traversal and format mismatch before requests", async () => {
  const io = deps();
  await expect(uploadRenderedImage({ ...input(), bucket: "production" }, config, io)).rejects.toThrow("Invalid");
  await expect(uploadRenderedImage({ ...input(), path: "../slide.png" }, config, io)).rejects.toThrow("Invalid");
  await expect(uploadRenderedImage({ ...input(), path: "run/slide.jpg" }, config, io)).rejects.toThrow("format mismatch");
  expect(io.fetch).not.toHaveBeenCalled();
});
it("expands original slide numbers in both imported path patterns", () => {
  expect(renderStoragePath("renders/{carousel_id}/slide_{nn}.jpg", { carousel_id: "CE-241", n: 3 }, "scratch/run-1")).toBe("scratch/run-1/renders/CE-241/slide_03.jpg");
  expect(renderStoragePath("{deck_key}/slide{n}.png", { deck_key: "glowup-1", n: 7 }, "scratch/run-1")).toBe("scratch/run-1/glowup-1/slide7.png");
});
it.each(["../{deck_key}/slide{n}.png", "{unknown}/slide{n}.png", "{deck_key}/slide{n}.svg", "/slide.png"])("rejects unsafe path pattern %s", pattern => {
  expect(() => renderStoragePath(pattern, { deck_key: "deck", n: 3 }, "scratch/run")).toThrow();
});
