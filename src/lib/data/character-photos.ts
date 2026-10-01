import { PHOTO_TYPES, characterSlug } from "@/lib/data/character-rules";
import { signStorageUrls } from "@/lib/data/storage-sign";

/**
 * Character profile photos (Garreth, 2026-10-01), in the private
 * `character-photos` bucket — the persona's face, so kept the way phone proof
 * screenshots are: written with the service key, shown through signed links.
 *
 * Each upload gets a NEW path and the old file is removed afterwards,
 * best-effort, so a cached copy of the old picture never stands in for the new.
 */
const BUCKET = "character-photos";

function service() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL;
  if (!key || !base) throw new Error("Supabase is not configured");
  return { base, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

/** Store the photo and point the character at it. Returns the new path. */
export async function uploadCharacterPhoto(
  character: string,
  oldPath: string | null,
  file: File,
): Promise<string> {
  const { base, headers } = service();
  const path = `${characterSlug(character)}/${Date.now()}.${PHOTO_TYPES[file.type]}`;

  const up = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": file.type },
    body: await file.arrayBuffer(),
    signal: AbortSignal.timeout(20_000),
  });
  if (!up.ok) {
    console.error(`character photo upload rejected (HTTP ${up.status}):`, await up.text().catch(() => ""));
    throw new Error(`The photo did not upload (HTTP ${up.status}). Nothing was changed.`);
  }

  const res = await fetch(`${base}/rest/v1/characters?character=eq.${encodeURIComponent(character)}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ photo_path: path, updated_at: new Date().toISOString() }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    // Do not leave a file nothing points at.
    await removePhoto(path);
    throw new Error(`Saving the photo failed (HTTP ${res.status}). Nothing was changed.`);
  }

  if (oldPath) await removePhoto(oldPath);
  return path;
}

async function removePhoto(path: string): Promise<void> {
  try {
    const { base, headers } = service();
    const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) console.error(`could not remove old character photo ${path} (HTTP ${res.status})`);
  } catch (err) {
    console.error(`could not remove old character photo ${path}`, err);
  }
}

/** Links to show the photos, good for an hour. */
export function signCharacterPhotos(paths: string[]): Promise<Record<string, string>> {
  return signStorageUrls(BUCKET, paths, 3600);
}
