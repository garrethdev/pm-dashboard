/**
 * What happens to a library image on the server (DEV-29): taking in an
 * upload, the black and white copy, the AI edit, and a generated picture
 * (DEV-30). Everything made from an image is a new image beside the
 * original; nothing is overwritten. What an image model makes is cleared of
 * its SynthID watermark (synthid.ts) and then goes through the degrade pass
 * before it is stored or shown (degrade.ts).
 *
 * A library kept here stores its pictures under its id in the library
 * bucket. A linked library (writable since 2026-10-22) stores them in its
 * own folder, in the set's subfolder when one is named, and a row carries
 * the rest. Uploads in flight and pending AI pictures always sit in the
 * library bucket under `incoming/` and `pending/`, whatever the library.
 */
import decode from "heic-decode";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { forgetPictures, readObject, removeObject, writeObject } from "@/server/carousel/repo/storage";
import { addImage, linkedPath, linkedSetFolder, type ImageRow, type LibraryRef } from "@/server/carousel/repo/libraries";
import { assertDegraded, assertNoMetadata, degrade } from "@/server/carousel/services/degrade";
import { removeSynthId } from "@/server/carousel/services/synthid";
import { generate, type Shape } from "@/server/carousel/services/higgsfield";

const MAX_EDGE = 2400;
export const IMAGE_MODEL = process.env.CAROUSEL_IMAGE_MODEL || "google/gemini-3.1-flash-image";

/** The kinds of picture that wait under `pending/` for Keep: already through the degrade pass. */
export const PENDING_KINDS = new Set(["ai_edit", "generated"]);

export const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heic" };

/** Where a new upload will sit. The name a person's file had is not kept in the path. */
export function uploadPath(libraryId: string, type: string): string {
  return `${libraryId}/incoming/${randomUUID()}.${EXT[type] ?? "bin"}`;
}

const isHeic = (path: string, type: string) => /\.hei[cf]$/i.test(path) || /hei[cf]/i.test(type);

async function open(bytes: Buffer, heic: boolean): Promise<sharp.Sharp> {
  if (!heic) return sharp(bytes, { failOn: "error" }).rotate();
  const { width, height, data } = await decode({ buffer: bytes });
  return sharp(Buffer.from(data), { raw: { width, height, channels: 4 } });
}

/** How light the picture is, 0 to 255, which the painter reads to choose a text colour. */
async function measure(img: sharp.Sharp): Promise<number | null> {
  try {
    const { channels } = await img.clone().removeAlpha().greyscale().stats();
    return Math.round(channels[0].mean * 10) / 10;
  } catch {
    return null;
  }
}

/** Where a finished picture goes, and the set row it is filed under. */
function destination(library: LibraryRef, setId: string | null, name: string): { path: string; setId: string | null } {
  if (!library.linked) return { path: `${library.id}/${name}`, setId };
  return { path: linkedPath(library, setId ? linkedSetFolder(library, setId) : null, name), setId: null };
}

/** Store a finished picture where its library keeps them and write its row. */
async function store(input: { library: LibraryRef; setId: string | null; bytes: Buffer; type: "image/jpeg" | "image/png"; width: number; height: number; by: string; derivedFrom?: string | null; madeBy: string | null; prompt?: string | null; degradeSeed?: string | null }): Promise<ImageRow> {
  const { library } = input;
  const dest = destination(library, input.setId, `${randomUUID()}.${input.type === "image/png" ? "png" : "jpg"}`);
  await writeObject(dest.path, input.bytes, input.type, library.bucket);
  if (library.linked) forgetPictures(library.bucket, library.prefix);
  const luminance = await measure(sharp(input.bytes));
  return addImage({ libraryId: library.id, setId: dest.setId, path: dest.path, bucket: library.bucket, luminance, width: input.width, height: input.height, derivedFrom: input.derivedFrom ?? null, madeBy: input.madeBy, prompt: input.prompt ?? null, by: input.by, degradeSeed: input.degradeSeed });
}

async function land(input: { library: LibraryRef; setId: string | null; img: sharp.Sharp; keepAlpha: boolean; by: string; derivedFrom?: string | null; madeBy: string; prompt?: string | null }): Promise<ImageRow> {
  const sized = input.img.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  const out = input.keepAlpha ? await sized.png().toBuffer({ resolveWithObject: true }) : await sized.flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
  assertNoMetadata(out.data);
  return store({ library: input.library, setId: input.setId, bytes: out.data, type: input.keepAlpha ? "image/png" : "image/jpeg", width: out.info.width, height: out.info.height, by: input.by, derivedFrom: input.derivedFrom, madeBy: input.madeBy, prompt: input.prompt });
}

/**
 * Take in a file the browser has put in the bucket. It is read, checked to
 * be a picture, turned the right way up, brought down to a sensible size,
 * and stored under its own id. The incoming file is removed either way.
 */
export async function takeUpload(input: { library: LibraryRef; setId: string | null; path: string; by: string; madeBy?: string; derivedFrom?: string | null; prompt?: string | null; keepAlpha?: boolean }): Promise<ImageRow> {
  const file = await readObject(input.path);
  if (!file) throw new Error("The upload did not arrive. Try again");
  // A pending file is an AI edit's or a generated picture's, already through the degrade pass.
  const pending = PENDING_KINDS.has(input.madeBy ?? "");
  if (/\/pending\//.test(input.path) !== pending) throw new Error("Unknown upload");
  if (pending) return keepPending({ ...input, madeBy: input.madeBy!, bytes: file.bytes });
  try {
    const img = await open(file.bytes, isHeic(input.path, file.type));
    const meta = await img.metadata();
    if (!meta.width || !meta.height) throw new Error("not a picture");
    if (meta.width < 200 || meta.height < 200) throw new Error("The picture is too small: at least 200 pixels on each side");
    const alpha = Boolean(input.keepAlpha && meta.hasAlpha);
    return await land({ library: input.library, setId: input.setId, img, keepAlpha: alpha, by: input.by, madeBy: input.madeBy ?? "upload", derivedFrom: input.derivedFrom, prompt: input.prompt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    throw new Error(/too small/.test(message) ? message : "That file could not be read as a picture");
  } finally {
    await removeObject(input.path).catch(() => undefined);
  }
}

/**
 * Keep, for an AI edit or a generated picture: the degraded JPEG is stored
 * as it is. Saving it again would put a second loss on top of the pass's.
 * The pending file's id was the pass's seed, so it is recorded with the
 * image.
 */
async function keepPending(input: { library: LibraryRef; setId: string | null; path: string; by: string; madeBy: string; derivedFrom?: string | null; prompt?: string | null; bytes: Buffer }): Promise<ImageRow> {
  try {
    const seed = /\/pending\/([0-9a-f-]{36})\.jpg$/i.exec(input.path)?.[1];
    if (!seed) throw new Error("This picture was made before the phone-quality pass. Make it again");
    let size: { width: number; height: number };
    try {
      size = assertDegraded(input.bytes);
    } catch {
      throw new Error("This picture was made before the phone-quality pass. Make it again");
    }
    return await store({ library: input.library, setId: input.setId, bytes: input.bytes, type: "image/jpeg", ...size, by: input.by, derivedFrom: input.derivedFrom, madeBy: input.madeBy, prompt: input.prompt, degradeSeed: seed });
  } finally {
    await removeObject(input.path).catch(() => undefined);
  }
}

async function original(row: ImageRow): Promise<sharp.Sharp> {
  const file = await readObject(row.storage_path, row.bucket);
  if (!file) throw new Error("The image's file is missing");
  return open(file.bytes, isHeic(row.storage_path, file.type));
}

/** The picture as a JPEG no larger than `edge`, which is what a model is sent. */
export async function thumbnail(row: ImageRow, edge: number): Promise<Buffer> {
  return (await original(row)).resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
}

/** Black and white: automatic, a new image beside the original. */
export async function blackAndWhite(library: LibraryRef, row: ImageRow, by: string): Promise<ImageRow> {
  const img = (await original(row)).greyscale();
  return land({ library, setId: row.set_id, img, keepAlpha: Boolean((await img.metadata()).hasAlpha), by, derivedFrom: row.id, madeBy: "black_and_white" });
}

/**
 * An AI edit. The model's picture is cleared of its SynthID watermark first
 * (the invisible one the degrade pass cannot touch) and then goes through
 * the degrade pass; only the degraded JPEG is stored, as a pending file
 * shown to the person. The raw picture and the cleared PNG are never
 * stored. It joins the library only on Keep, and Discard removes the file.
 */
export async function aiEdit(row: ImageRow, prompt: string): Promise<{ path: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("The image model is not connected: OPENROUTER_API_KEY is not set");
  const src = await thumbnail(row, 1536);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://pm-dashboard-ashen.vercel.app", "X-Title": "PM Dashboard Carousel Generator" },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `Edit this photograph as asked and return the edited photograph. Keep the person, the framing and the shape of the picture the same unless the request says otherwise. Do not add text, borders or watermarks.\n\nThe request: ${prompt}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${src.toString("base64")}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (res.status === 402) throw new Error("The image model's account is out of credit");
  if (!res.ok) throw new Error(`The image model could not be reached (HTTP ${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string; images?: { image_url?: { url?: string } }[] } }[] };
  const message = json.choices?.[0]?.message;
  const url = message?.images?.[0]?.image_url?.url;
  const m = url ? /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(url) : null;
  if (!m) throw new Error(message?.content ? `The image model declined: ${message.content.slice(0, 200)}` : "The image model returned no picture");
  const bytes = Buffer.from(m[2], "base64");
  return { path: await park(row.library_id, bytes, "carousel-ai-edit") };
}

/**
 * The last step every AI picture takes (Garreth, 2026-10-12 and 2026-10-21):
 * the SynthID removal, then the degrade pass, and the degraded JPEG written
 * as a pending file. The raw render and the cleared PNG are never stored.
 */
async function park(libraryId: string, bytes: Buffer, label: string): Promise<string> {
  const checked = await sharp(bytes).metadata();
  if (!checked.width || !checked.height) throw new Error("The image model returned something that is not a picture");
  const id = randomUUID();
  const cleared = await removeSynthId(bytes, label);
  const degraded = await degrade(cleared.bytes, id);
  const path = `${libraryId}/pending/${id}.jpg`;
  await writeObject(path, degraded.bytes, "image/jpeg");
  return path;
}

/**
 * Generate one picture (DEV-30): Higgsfield's Soul 2 from the prompt, or
 * from a base picture when one is given (one of the library's own, an
 * uploaded reference, or a pending picture being tried again), so the face
 * or the place is kept. The result goes through the same SynthID removal
 * and degrade pass as an AI edit and waits under `pending/` for Keep. The
 * pending file is the only copy; Discard removes it.
 */
export async function generateImage(input: { libraryId: string; prompt: string; shape: Shape; baseUrl: string | null }): Promise<{ path: string; requestId: string }> {
  const { bytes, requestId } = await generate({ prompt: input.prompt, shape: input.shape, baseImageUrl: input.baseUrl });
  return { path: await park(input.libraryId, bytes, "carousel-generate"), requestId };
}
