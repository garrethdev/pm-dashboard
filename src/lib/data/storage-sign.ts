/**
 * Short-lived links to files in a PRIVATE Storage bucket, made with the
 * service key. The only way to show such a file in the browser.
 *
 * Never cached: a link remembered for longer than it lives is a broken image.
 * A failure returns no links rather than throwing — a missing thumbnail should
 * not take a whole page down with it.
 */
export async function signStorageUrls(
  bucket: string,
  paths: string[],
  expiresInSeconds = 600,
): Promise<Record<string, string>> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL;
  if (!key || !base || paths.length === 0) return {};
  try {
    const res = await fetch(`${base}/storage/v1/object/sign/${bucket}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: expiresInSeconds, paths }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`${bucket} signing failed (HTTP ${res.status})`);
      return {};
    }
    const rows = (await res.json()) as { path: string; signedURL: string | null; error: string | null }[];
    const out: Record<string, string> = {};
    for (const r of rows) {
      if (r.signedURL) out[r.path] = `${base}/storage/v1${r.signedURL}`;
    }
    return out;
  } catch (err) {
    console.error(`${bucket} signing failed`, err);
    return {};
  }
}
