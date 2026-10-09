import { attempt, bad, body, guard, ok, str } from "@/server/carousel/http";
import { createLibrary, createLinkedLibrary, listLibraries } from "@/server/carousel/repo/libraries";

export async function GET() {
  const g = await guard();
  if (g.denied) return g.denied;
  try {
    return ok({ libraries: await listLibraries() });
  } catch (err) {
    console.error("carousel libraries failed", err);
    return bad("Libraries could not be loaded", 502);
  }
}

/**
 * New library (DEV-29): a name and an empty grid, uploads later. Or, with a
 * bucket and folder (2026-10-08), a live link to that folder, read-only.
 */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const name = str(b.name, 80).trim();
  if (!name) return bad("A name is required");
  const bucket = str(b.bucket, 100).trim();
  if (bucket) {
    if (!/^[a-zA-Z0-9._-]+$/.test(bucket)) return bad("Unknown bucket");
    const prefix = str(b.prefix, 300).replace(/^\/+|\/+$/g, "");
    return attempt(g.email, "carousel.library.link", name, () => createLinkedLibrary(name, bucket, prefix, g.email), { bucket, prefix });
  }
  return attempt(g.email, "carousel.library.create", name, () => createLibrary(name, g.email));
}

export const dynamic = "force-dynamic";
