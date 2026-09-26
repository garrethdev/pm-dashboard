import { bad, guard, ok } from "@/server/carousel/http";
import { overviewData } from "@/server/carousel/repo/catalog";

export async function GET() {
  const g = await guard();
  if (g.denied) return g.denied;
  try {
    return ok(await overviewData(g.email));
  } catch (err) {
    console.error("carousel overview failed", err);
    return bad("Overview could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
