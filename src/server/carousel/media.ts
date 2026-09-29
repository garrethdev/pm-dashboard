/**
 * Slide images the browser can show.
 *
 * Roughly half the slides read by the Sep 8 to 12 intake point at TikTok's
 * HEIC files. TikTok serves them, but no browser renders HEIC, so those
 * carousels showed empty grey slides in the feed, the saves rail and the
 * details window (Garreth, 2026-09-26). The CDN refuses a JPEG or WebP for
 * the same signed link, so the image is converted here instead: a slide
 * whose link ends in .heic is served through /api/carousel-generator/image,
 * which fetches it and hands back a JPEG. Everything else is left alone.
 */
const HOSTS = [/\.tiktokcdn(-us|-eu)?\.com$/i, /^auth\.virlo\.ai$/i];

export function isAllowedImageHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return HOSTS.some((h) => h.test(host));
  } catch {
    return false;
  }
}

export function isHeic(url: string): boolean {
  try {
    return /\.heic$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/**
 * TikTok's slide links are signed and carry their own expiry (`x-expires`,
 * seconds since the epoch). Once past, the CDN answers 403 and the slide
 * shows as an empty grey box. An expired link is treated as no image at
 * all, so the durable Virlo thumbnail can stand in for the cover.
 */
export function isExpired(url: string, now = Date.now()): boolean {
  try {
    const u = new URL(url);
    if (!/tiktokcdn/i.test(u.hostname)) return false;
    const x = Number(u.searchParams.get("x-expires"));
    return Number.isFinite(x) && x > 0 && x * 1000 < now;
  } catch {
    return false;
  }
}

/** The link the page should use for a slide: converted when the browser could not show it, null when it is gone. */
export function displayUrl(url: string | null, now = Date.now()): string | null {
  if (!url) return null;
  if (isExpired(url, now)) return null;
  if (isHeic(url) && isAllowedImageHost(url)) return `/api/carousel-generator/image?src=${encodeURIComponent(url)}`;
  return url;
}
