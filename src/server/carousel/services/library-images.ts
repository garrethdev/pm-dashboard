/**
 * What happens to a library image on the server (DEV-29): taking in an
 * upload, the black and white copy, and the AI edit. Everything made from
 * an image is a new image beside the original; nothing is overwritten.
 */
import decode from "heic-decode";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { readObject, removeObject, writeObject } from "@/server/carousel/repo/storage";
import { addImage, type ImageRow } from "@/server/carousel/repo/libraries";

const MAX_EDGE = 2400;
export const IMAGE_MODEL = process.env.CAROUSEL_IMAGE_MODEL || "google/gemini-3.1-flash-image";

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

async function land(input: { libraryId: string; setId: string | null; img: sharp.Sharp; keepAlpha: boolean; by: string; derivedFrom?: string | null; madeBy: string; prompt?: string | null }): Promise<ImageRow> {
  const sized = input.img.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  const out = input.keepAlpha ? await sized.png().toBuffer({ resolveWithObject: true }) : await sized.flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
  const path = `${input.libraryId}/${randomUUID()}.${input.keepAlpha ? "png" : "jpg"}`;
  await writeObject(path, out.data, input.keepAlpha ? "image/png" : "image/jpeg");
  const luminance = await measure(sharp(out.data));
  return addImage({ libraryId: input.libraryId, setId: input.setId, path, luminance, width: out.info.width, height: out.info.height, derivedFrom: input.derivedFrom ?? null, madeBy: input.madeBy, prompt: input.prompt ?? null, by: input.by });
}

/**
 * Take in a file the browser has put in the bucket. It is read, checked to
 * be a picture, turned the right way up, brought down to a sensible size,
 * and stored under its own id. The incoming file is removed either way.
 */
export async function takeUpload(input: { libraryId: string; setId: string | null; path: string; by: string; madeBy?: string; derivedFrom?: string | null; prompt?: string | null; keepAlpha?: boolean }): Promise<ImageRow> {
  const file = await readObject(input.path);
  if (!file) throw new Error("The upload did not arrive. Try again");
  try {
    const img = await open(file.bytes, isHeic(input.path, file.type));
    const meta = await img.metadata();
    if (!meta.width || !meta.height) throw new Error("not a picture");
    if (meta.width < 200 || meta.height < 200) throw new Error("The picture is too small: at least 200 pixels on each side");
    const alpha = Boolean(input.keepAlpha && meta.hasAlpha);
    return await land({ libraryId: input.libraryId, setId: input.setId, img, keepAlpha: alpha, by: input.by, madeBy: input.madeBy ?? "upload", derivedFrom: input.derivedFrom, prompt: input.prompt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    throw new Error(/too small/.test(message) ? message : "That file could not be read as a picture");
  } finally {
    await removeObject(input.path).catch(() => undefined);
  }
}

async function original(row: ImageRow): Promise<sharp.Sharp> {
  const file = await readObject(row.storage_path);
  if (!file) throw new Error("The image's file is missing");
  return open(file.bytes, isHeic(row.storage_path, file.type));
}

/** Black and white: automatic, a new image beside the original. */
export async function blackAndWhite(row: ImageRow, by: string): Promise<ImageRow> {
  const img = (await original(row)).greyscale();
  return land({ libraryId: row.library_id, setId: row.set_id, img, keepAlpha: Boolean((await img.metadata()).hasAlpha), by, derivedFrom: row.id, madeBy: "black_and_white" });
}

/**
 * An AI edit. The result is stored as a pending file and shown to the
 * person; it joins the library only on Keep, and Discard removes the file.
 */
export async function aiEdit(row: ImageRow, prompt: string): Promise<{ path: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("The image model is not connected: OPENROUTER_API_KEY is not set");
  const src = await (await original(row)).resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
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
  const checked = await sharp(bytes).metadata();
  if (!checked.width || !checked.height) throw new Error("The image model returned something that is not a picture");
  const path = `${row.library_id}/pending/${randomUUID()}.${EXT[m[1].toLowerCase()] ?? "png"}`;
  await writeObject(path, bytes, m[1]);
  return { path };
}
