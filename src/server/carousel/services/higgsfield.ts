/**
 * Higgsfield's developer API (DEV-30), the provider chosen for Generate
 * images. Checked against the public docs on 2026-10-22: it is a separate
 * product from the higgsfield.ai subscription, paid from its own balance, and
 * keyed from open.higgsfield.ai. One picture is made by submitting a job,
 * polling its status until it is finished, and downloading the result.
 *
 * The model is Soul 2, Higgsfield's own portrait model. With a base image it
 * runs as image-to-image (the picture keeps the face or the place); without
 * one it runs from the prompt alone. The API has no 4:5, so "portrait" is
 * 3:4 and the painter crops to the slide cell as it already does for every
 * library picture.
 */
import { randomUUID } from "node:crypto";

/** Resolved per call so a test (or a later env set) can point it elsewhere. */
const base = () => process.env.HIGGSFIELD_API_URL || "https://api.higgsfield.ai";

export type Shape = "portrait" | "tall" | "square";

/** The three shapes the form offers, and what Soul 2 is asked for. */
export const SHAPES: Record<Shape, string> = { portrait: "3:4", tall: "9:16", square: "1:1" };

export const isShape = (v: unknown): v is Shape => typeof v === "string" && v in SHAPES;

export const SOUL_TEXT = "higgsfield-ai/soul/v2/standard";
export const SOUL_IMAGE = "higgsfield-ai/soul/v2/image-to-image";

/** 1080p is $0.0057 a picture (2026-10-22); the degrade pass shrinks it anyway. */
const RESOLUTION = "1080p";

const POLL_MS = 3_000;
const WAIT_MS = 150_000; // the route's 300 s ceiling also has to fit the SynthID removal
const FETCH_MS = 30_000;

/**
 * A failure that stops the whole run, not just one picture: the key is
 * missing or refused, or the balance is empty. The route passes `code` on,
 * and the page fails every waiting tile with the same reason.
 */
export class HiggsfieldError extends Error {
  readonly code: "run_blocked" | undefined;
  constructor(message: string, blocksRun = false) {
    super(message);
    this.code = blocksRun ? "run_blocked" : undefined;
  }
}

interface Submitted {
  request_id: string;
  status_url?: string;
}

interface Status {
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled" | string;
  images?: { url: string }[];
  error?: string | null;
}

/** One request to the API, keyed, with every refusal turned into plain words. */
async function http(path: string, init: RequestInit = {}): Promise<Response> {
  const key = process.env.HIGGSFIELD_API_KEY;
  if (!key) throw new HiggsfieldError("Image generation is not connected: HIGGSFIELD_API_KEY is not set", true);
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { Authorization: `Key ${key}`, ...(init.headers ?? {}) },
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(FETCH_MS),
  });
  if (res.ok) return res;
  let detail = "";
  try {
    const d = ((await res.json()) as { detail?: unknown }).detail;
    detail = typeof d === "string" ? d : Array.isArray(d) ? d.map((x) => (typeof x === "object" && x && "msg" in x ? String((x as { msg: unknown }).msg) : String(x))).join("; ") : "";
  } catch {
    // A plain body; the status below says the rest.
  }
  switch (res.status) {
    case 401:
      throw new HiggsfieldError("Higgsfield refused the key (HIGGSFIELD_API_KEY)", true);
    case 403:
      throw new HiggsfieldError("The Higgsfield account is out of funds", true);
    case 400:
    case 422:
      throw new HiggsfieldError(detail ? `Higgsfield refused the request: ${detail}` : "Higgsfield refused the request");
    case 404:
      throw new HiggsfieldError("Higgsfield does not know that model or request");
    case 423:
    case 503:
      throw new HiggsfieldError("The image model is not available right now. Try again later");
    default:
      throw new HiggsfieldError(`Higgsfield could not be reached (HTTP ${res.status})`);
  }
}

export interface Ask {
  prompt: string;
  shape: Shape;
  /** A public link to one of the library's own pictures; the face or the place is kept. */
  baseImageUrl?: string | null;
  seed?: number | null;
}

/** Ask for one picture. The answer is a job id to wait on, not the picture. */
export async function submit(ask: Ask): Promise<{ requestId: string }> {
  const model = ask.baseImageUrl ? SOUL_IMAGE : SOUL_TEXT;
  const res = await http(`/${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      prompt: ask.prompt,
      aspect_ratio: SHAPES[ask.shape],
      resolution: RESOLUTION,
      batch_size: 1,
      enhance_prompt: true,
      ...(ask.baseImageUrl ? { image_url: ask.baseImageUrl } : {}),
      ...(ask.seed ? { seed: ask.seed } : {}),
    }),
  });
  const json = (await res.json()) as Submitted;
  if (!json.request_id) throw new HiggsfieldError("Higgsfield accepted the request but gave it no id");
  return { requestId: json.request_id };
}

/** Wait for a job to finish and hand back the picture links. */
export async function awaitImages(requestId: string): Promise<string[]> {
  const at = Date.now();
  for (;;) {
    const res = await http(`/requests/${encodeURIComponent(requestId)}/status`);
    const s = (await res.json()) as Status;
    switch (s.status) {
      case "completed": {
        const urls = (s.images ?? []).map((i) => i.url).filter(Boolean);
        if (!urls.length) throw new HiggsfieldError("Higgsfield finished but returned no picture");
        return urls;
      }
      case "failed":
        throw new HiggsfieldError(s.error ? `Higgsfield could not make the picture: ${s.error}` : "Higgsfield could not make the picture");
      case "nsfw":
        throw new HiggsfieldError("Higgsfield declined the picture as unsafe. Change the prompt");
      case "canceled":
        throw new HiggsfieldError("The request was cancelled");
    }
    if (Date.now() - at > WAIT_MS) throw new HiggsfieldError("Higgsfield took too long to make the picture");
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

/** Fetch a finished picture. The link is public, so it carries no key. */
export async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(FETCH_MS) });
  if (!res.ok) throw new HiggsfieldError(`The picture could not be downloaded (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Submit, wait and download: one picture's bytes. */
export async function generate(ask: Ask): Promise<{ bytes: Buffer; requestId: string }> {
  const { requestId } = await submit(ask);
  const [url] = await awaitImages(requestId);
  return { bytes: await download(url), requestId };
}
