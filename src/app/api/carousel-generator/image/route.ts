/**
 * Serve a slide image the browser cannot show as one it can.
 *
 * Only two things happen here: the image is fetched from a host we know
 * (TikTok's CDN or Virlo), and a HEIC file is decoded and re-encoded as JPEG.
 * Anything else is passed through with its own type. See
 * src/server/carousel/media.ts for why this exists.
 */
import decode from "heic-decode";
import sharp from "sharp";
import { guard } from "@/server/carousel/http";
import { logError } from "@/server/carousel/log";
import { isAllowedImageHost, isHeic } from "@/server/carousel/media";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
// The source links are signed and stable for weeks, and the picture never
// changes, so the converted copy can sit in the browser and on the CDN.
const CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

export async function GET(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const src = new URL(req.url).searchParams.get("src") ?? "";
  if (!src || !isAllowedImageHost(src)) return new Response("Not an image we serve", { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetch(src, { signal: AbortSignal.timeout(15_000), headers: { Accept: "image/*" } });
  } catch (err) {
    logError(`image fetch ${src.slice(0, 80)}`, err);
    return new Response("Image could not be fetched", { status: 502 });
  }
  if (!upstream.ok) return new Response("Image is gone", { status: upstream.status === 404 ? 404 : 502 });
  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return new Response("Image too large", { status: 413 });
  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return new Response("Image too large", { status: 413 });

  const type = upstream.headers.get("content-type") ?? "";
  if (!isHeic(src) && !/heic|heif/i.test(type)) {
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": type || "image/jpeg", "Cache-Control": CACHE } });
  }
  try {
    const { width, height, data } = await decode({ buffer: bytes });
    const jpeg = await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } }).jpeg({ quality: 82 }).toBuffer();
    return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": CACHE } });
  } catch (err) {
    logError(`image convert ${src.slice(0, 80)}`, err);
    return new Response("Image could not be converted", { status: 502 });
  }
}
