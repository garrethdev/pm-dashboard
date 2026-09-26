import { attempt, bad, body, guard, ok, str } from "@/server/carousel/http";
import { createLibrary, listLibraries } from "@/server/carousel/repo/libraries";

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

/** New library (DEV-29): a name and an empty grid. Uploads come later. */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const name = str(b.name, 80).trim();
  if (!name) return bad("A name is required");
  return attempt(g.email, "carousel.library.create", name, () => createLibrary(name, g.email));
}

export const dynamic = "force-dynamic";
