import { createHash } from "node:crypto";

class StorageFailure extends Error {
  constructor(readonly retryable: boolean) { super("Rendered image storage verification failed"); }
}
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Server-internal, explicit configuration only. No credential discovery, bucket
 * creation or overwrite. The job service must authenticate ownership and pin its
 * bucket/path before calling. A verified object is NOT an approved/persisted deck.
 */
export async function uploadRenderedImage(input: { bucket: string; path: string; format: "png" | "jpeg"; bytes: Buffer },
  config: { origin: string; serviceKey: string; allowedBuckets: readonly string[] },
  dependencies: { fetch: typeof fetch; sleep: (ms: number) => Promise<void> } = {
    fetch, sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
  }) {
  let origin: URL;
  try { origin = new URL(config.origin); } catch { throw new Error("Invalid storage configuration"); }
  // Restrict this credential-bearing adapter to a configured hosted Supabase
  // project, not a template-supplied endpoint or a redirect target.
  if (origin.protocol !== "https:" || !/^[a-z0-9-]+\.supabase\.co$/.test(origin.hostname) || origin.port ||
    origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" ||
    typeof config.serviceKey !== "string" || !config.serviceKey.trim()) throw new Error("Invalid storage configuration");
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(input.bucket) || !config.allowedBuckets.includes(input.bucket) ||
    typeof input.path !== "string" || input.path.length > 1024 || !input.path.split("/").every(s => /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(s)) ||
    !["png", "jpeg"].includes(input.format) || !Buffer.isBuffer(input.bytes) || !input.bytes.length || input.bytes.length > 20_000_000) throw new Error("Invalid rendered image upload");
  const bytes = Buffer.from(input.bytes), expected = digest(bytes), bucket = input.bucket, path = input.path;
  const format = input.format, mime = format === "png" ? "image/png" : "image/jpeg";
  if (!(format === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
    !(format === "png" ? path.endsWith(".png") : /\.jpe?g$/.test(path))) throw new Error("Rendered image format mismatch");
  const object = `${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const headers = { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new StorageFailure(true)); }, 20_000);
    });
    const work = async () => {
      const uploaded = await dependencies.fetch(`${origin.origin}/storage/v1/object/${object}`, {
        method: "POST", headers: { ...headers, "Content-Type": mime, "x-upsert": "false", "Cache-Control": "max-age=31536000" },
        body: new Uint8Array(bytes), redirect: "error", signal: controller.signal,
      });
      await uploaded.body?.cancel();
      if (controller.signal.aborted) throw new StorageFailure(true);
      // Supabase duplicate uploads can return 400 or 409. Neither is success
      // unless authenticated readback proves byte-for-byte equivalence.
      if (!uploaded.ok && ![400, 409].includes(uploaded.status)) throw new StorageFailure(uploaded.status === 408 || uploaded.status === 429 || uploaded.status >= 500);
      // Matches storage-js's authenticated download: GET /object/<bucket>/<path>
      // with authorization headers (not the public or image-transform endpoint).
      const readback = await dependencies.fetch(`${origin.origin}/storage/v1/object/${object}`, {
        headers, redirect: "error", signal: controller.signal, cache: "no-store",
      });
      if (controller.signal.aborted) { await readback.body?.cancel(); throw new StorageFailure(true); }
      if (!readback.ok || !readback.body) {
        await readback.body?.cancel();
        throw new StorageFailure(readback.status === 404 || readback.status === 408 || readback.status === 429 || readback.status >= 500);
      }
      const hash = createHash("sha256"), reader = readback.body.getReader(); let size = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > bytes.length || controller.signal.aborted) throw new StorageFailure(false);
          hash.update(chunk.value);
        }
      } finally { await reader.cancel().catch(() => {}); }
      if (size !== bytes.length || hash.digest("hex") !== expected) throw new StorageFailure(false);
      return { bucket, path, format, sha256: expected, byteLength: bytes.length, verified: true as const,
        reused: !uploaded.ok, attempts: attempt };
    };
    try { return await Promise.race([work(), timeout]); }
    catch (error) {
      if (attempt === 3 || error instanceof StorageFailure && !error.retryable) throw new Error("Rendered image storage verification failed");
    } finally { clearTimeout(timer); controller.abort(); }
    await dependencies.sleep(attempt * 250);
  }
  throw new Error("Rendered image storage verification failed");
}
