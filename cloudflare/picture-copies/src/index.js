/**
 * Serves the small copies of our pictures from Cloudflare R2 (2026-11-04).
 *
 * The dashboard asks for /<width>/<bucket>/<path>, for example
 * /540/rich-life-images/character-6/a.jpg (src/lib/carousel/thumb.ts). If the
 * copy has been made it is sent from R2, and Supabase is never asked. If it
 * has not been made yet (a picture added since the last daily copy run), the
 * browser is sent on to Supabase's own resizer, which is how every picture
 * was shown before, so nothing shows blank while the copies catch up.
 *
 * Copies are kept an hour in the browser, not forever: when an original is
 * replaced at the same path, its copy is replaced under the same name.
 */
const WIDTHS = new Set(["540", "1080"]);
const BUCKETS = new Set(["rich-life-images", "reference-slides"]);

const worker = {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
    const url = new URL(request.url);
    const [, width, bucket, ...parts] = url.pathname.split("/");
    if (!WIDTHS.has(width) || !BUCKETS.has(bucket) || !parts.length) return new Response("Not found", { status: 404 });
    let path;
    try {
      path = parts.map(decodeURIComponent).join("/");
    } catch {
      return new Response("Not found", { status: 404 });
    }
    const copy = await env.COPIES.get(`${bucket}/${path}/${width}.webp`);
    if (copy) {
      const headers = new Headers({ "Content-Type": "image/webp", "Cache-Control": "public, max-age=3600", ETag: copy.httpEtag });
      return new Response(request.method === "HEAD" ? null : copy.body, { headers });
    }
    const fallback = `${env.SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${parts.join("/")}?width=${width}&quality=70&resize=contain`;
    return new Response(null, { status: 302, headers: { Location: fallback, "Cache-Control": "no-store" } });
  },
};

export default worker;
