/**
 * The SynthID removal step (Garreth, 2026-10-21). Every AI edit now runs
 * through the SynthID Study API before the degrade pass: it removes the
 * invisible SynthID watermark the degrade pass cannot touch (the run goes
 * over the pixels), and the C2PA manifest goes with the rest of the
 * metadata. Its output is a lossless PNG, which the degrade pass then
 * re-makes as the stored phone-camera JPEG; the cleared PNG itself is
 * never stored.
 *
 * The API is batch-shaped (create, upload, start, poll, take the output),
 * so a single AI edit is a batch of one. "Generate with AI" will reuse the
 * same call for a whole set. A clean detector result is a detector result,
 * not proof (the study's own rule): nothing here is ever called "clean".
 */
import { randomUUID } from "node:crypto";

/** Resolved per call so a test (or a later env set) can point it elsewhere. */
const base = () => process.env.SYNTHID_API_URL || "https://garreth-dottin1--synthid-study-api.us-east.modal.run";

/** The study's verified settings; changing one is a decision for the whole set. */
const SETTINGS = { strength: 0.5, preset: "google", seed: 0, maxSide: 1536 } as const;

const POLL_MS = 10_000;
const WAIT_MS = 285_000; // just inside the route's 300 s ceiling
const FETCH_MS = 30_000;

interface Created {
  id: string;
}

interface Item {
  id: string;
  name: string;
  status: string;
  output: string | null;
  error: string | null;
}

interface Batch {
  summary: { total: number; done: number; error: number; cancelled: number };
  batch: { items: Item[] };
}

/** One request to the API, keyed and refusal-read the way the writer's is. */
async function http(path: string, init: RequestInit = {}): Promise<Response> {
  const key = process.env.SYNTHID_API_KEY;
  if (!key) throw new Error("The watermark remover is not connected: SYNTHID_API_KEY is not set");
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(FETCH_MS),
  });
  if (res.status === 401) throw new Error("The watermark remover refused the key (SYNTHID_API_KEY)");
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { detail?: string }).detail ?? "";
    } catch {
      // A plain body; the status below says the rest.
    }
    throw new Error(detail ? `The watermark remover refused the request: ${detail}` : `The watermark remover could not be reached (HTTP ${res.status})`);
  }
  return res;
}

async function created(label: string): Promise<string> {
  const res = await http("/api/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count: 1, label, ...SETTINGS }),
  });
  return ((await res.json()) as Created).id;
}

/** The source's format, so the upload is named and typed the way it arrived. */
function picture(bytes: Buffer): { mime: string; name: string } {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { mime: "image/jpeg", name: "edit.jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", name: "edit.png" };
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return { mime: "image/webp", name: "edit.webp" };
  throw new Error("The watermark remover accepts a PNG, JPEG or WEBP picture");
}

async function upload(batchId: string, bytes: Buffer): Promise<void> {
  const { mime, name } = picture(bytes);
  const boundary = `----pm${randomUUID().replace(/-/g, "")}`;
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${mime}\r\n\r\n`);
  const body = new Uint8Array(Buffer.concat([head, bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]));
  await http(`/api/batches/${batchId}/files`, { method: "POST", headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` }, body });
}

async function start(batchId: string): Promise<void> {
  await http(`/api/batches/${batchId}/start`, { method: "POST" });
}

async function poll(batchId: string): Promise<Batch> {
  const at = Date.now();
  for (;;) {
    const res = await http(`/api/batches/${batchId}`);
    const batch = (await res.json()) as Batch;
    const s = batch.summary;
    if (s.done + s.error + s.cancelled >= s.total) return batch;
    if (Date.now() - at > WAIT_MS) throw new Error("The watermark remover took too long to finish the picture");
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

async function take(batchId: string, output: string): Promise<Buffer> {
  const res = await http(`/files/${batchId}/output/${encodeURIComponent(output)}`);
  return Buffer.from(await res.arrayBuffer());
}

export interface Cleared {
  bytes: Buffer;
  batchId: string;
}

/**
 * Remove a picture's SynthID watermark: a batch of one, run to done, and the
 * cleared PNG handed back. The GPU cold start and the face pass make the
 * first call slow, which the route's own time limit bounds.
 */
export async function removeSynthId(input: Buffer, label = "carousel-ai-edit"): Promise<Cleared> {
  const batchId = await created(label);
  await upload(batchId, input);
  await start(batchId);
  const batch = await poll(batchId);
  const item = batch.batch.items[0];
  if (!item || item.status !== "done") throw new Error(item?.error || "The watermark remover could not process the picture");
  if (!item.output) throw new Error("The watermark remover returned no picture");
  return { bytes: await take(batchId, item.output), batchId };
}