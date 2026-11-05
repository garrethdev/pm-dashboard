/**
 * A small copy of a picture in our storage, for showing it on a screen. The
 * final carousels never use this; they read the full original.
 *
 * Supabase on the fly (2026-10-09, after the Character 6 library took
 * production down: its grid asked for 217 full-size originals at once, and
 * the storage service opened a database connection for each, past the
 * pooler's limit). A public object link becomes a render link with a width;
 * Supabase resizes once and the CDN keeps the result. A 255 KB original comes
 * back as a 42 KB thumbnail.
 *
 * `resize=contain`, not `cover` (2026-10-31): with only a width given, `cover`
 * keeps the full height and cuts the width to fit, so a 1080 by 1920 slide asked
 * at 540 came back 540 by 1920, the middle strip of it, and every Trends card
 * showed a zoomed, cropped cover. `contain` keeps the shape (540 by 960); the
 * page crops to its own box with CSS. Any other link (TikTok, Virlo, a data URL) is left as it is.
 *
 * Copies made in advance on Cloudflare (2026-11-04). Even resized on the fly,
 * the first showing of every picture still made Supabase look it up in the
 * database. The library and Trends pictures now have two copies, 540 and 1080
 * wide, made once by a daily job (src/server/carousel/services/picture-copies.ts)
 * and served from Cloudflare by `NEXT_PUBLIC_PICTURE_COPIES_URL`, which never
 * touches Supabase. A picture whose copy is not made yet is sent on by
 * Cloudflare to the Supabase link above, so nothing shows blank while the
 * copies catch up. Leave the setting empty to go back to Supabase entirely.
 */
const PUBLIC_OBJECT = "/storage/v1/object/public/";
const RENDER = "/storage/v1/render/image/public/";

/** The buckets that have copies, and the two widths each picture is copied at. */
export const COPY_BUCKETS = ["rich-life-images", "reference-slides"] as const;
export const COPY_WIDTHS = [540, 1080] as const;

/** Where a copy is kept in the R2 bucket: the original's own path, then the width. */
export const copyKey = (bucket: string, path: string, width: number) => `${bucket}/${path}/${width}.webp`;

const decodePart = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export function thumbUrl(url: string | null | undefined, width = 320): string | null {
  if (!url) return null;
  const at = url.indexOf(PUBLIC_OBJECT);
  if (at < 0 || url.includes("?")) return url;
  const rest = url.slice(at + PUBLIC_OBJECT.length);
  const copies = process.env.NEXT_PUBLIC_PICTURE_COPIES_URL;
  const slash = rest.indexOf("/");
  const bucket = slash > 0 ? rest.slice(0, slash) : "";
  if (copies && (COPY_BUCKETS as readonly string[]).includes(bucket)) {
    const w = width <= COPY_WIDTHS[0] ? COPY_WIDTHS[0] : COPY_WIDTHS[1];
    const path = rest.slice(slash + 1).split("/").map((s) => encodeURIComponent(decodePart(s))).join("/");
    return `${copies.replace(/\/+$/, "")}/${w}/${bucket}/${path}`;
  }
  const w = Math.max(64, Math.min(1600, Math.round(width)));
  return `${url.slice(0, at)}${RENDER}${rest}?width=${w}&quality=70&resize=contain`;
}
