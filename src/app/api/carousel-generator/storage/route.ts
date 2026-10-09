import { bad, guard, ok } from "@/server/carousel/http";
import { listBuckets, listFolder } from "@/server/carousel/repo/storage";

/**
 * Browsing our storage to link a library to a folder (Garreth, 2026-10-08).
 * Without a bucket: the public buckets. With one: that folder's subfolders
 * and how many pictures sit directly in it.
 */
export async function GET(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const url = new URL(req.url);
  const bucket = url.searchParams.get("bucket")?.trim() ?? "";
  const prefix = (url.searchParams.get("prefix") ?? "").replace(/^\/+|\/+$/g, "").slice(0, 300);
  try {
    if (!bucket) return ok({ buckets: (await listBuckets()).filter((b) => b.public).map((b) => b.id) });
    if (!/^[a-zA-Z0-9._-]{1,100}$/.test(bucket)) return bad("Unknown bucket");
    const rows = await listFolder(bucket, prefix);
    return ok({ folders: rows.filter((r) => r.folder).map((r) => r.name), pictures: rows.filter((r) => !r.folder && (!r.mimetype || r.mimetype.startsWith("image/"))).length });
  } catch (err) {
    console.error("carousel storage browse failed", err);
    return bad("The folder could not be listed", 502);
  }
}

export const dynamic = "force-dynamic";
