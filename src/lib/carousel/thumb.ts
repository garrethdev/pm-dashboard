/**
 * A small copy of a picture in our storage, made by Supabase on the fly
 * (2026-10-09, after the Character 6 library took production down: its grid
 * asked for 217 full-size originals at once, and the storage service opened
 * a database connection for each, past the pooler's limit).
 *
 * A public object link becomes a render link with a width; Supabase resizes
 * once and the CDN keeps the result. A 255 KB original comes back as a 42 KB
 * thumbnail.
 *
 * `resize=contain`, not `cover` (2026-10-31): with only a width given, `cover`
 * keeps the full height and cuts the width to fit, so a 1080 by 1920 slide asked
 * at 540 came back 540 by 1920, the middle strip of it, and every Trends card
 * showed a zoomed, cropped cover. `contain` keeps the shape (540 by 960); the
 * page crops to its own box with CSS. Any other link (TikTok, Virlo, a data URL) is left as it is.
 */
const PUBLIC_OBJECT = "/storage/v1/object/public/";
const RENDER = "/storage/v1/render/image/public/";

export function thumbUrl(url: string | null | undefined, width = 320): string | null {
  if (!url) return null;
  const at = url.indexOf(PUBLIC_OBJECT);
  if (at < 0 || url.includes("?")) return url;
  const w = Math.max(64, Math.min(1600, Math.round(width)));
  return `${url.slice(0, at)}${RENDER}${url.slice(at + PUBLIC_OBJECT.length)}?width=${w}&quality=70&resize=contain`;
}
