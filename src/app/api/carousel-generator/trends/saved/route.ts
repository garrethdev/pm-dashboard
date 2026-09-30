import { bad, guard, ok } from "@/server/carousel/http";
import { savedFeed } from "@/server/carousel/repo/trends";

export async function GET() {
  const g = await guard();
  if (g.denied) return g.denied;
  try {
    return ok({ items: await savedFeed(g.email) });
  } catch (err) {
    console.error("carousel saved failed", err);
    return bad("Saved could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
