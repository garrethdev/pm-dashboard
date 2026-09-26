import { bad, guard, ok } from "@/server/carousel/http";
import { searchTracks } from "@/server/carousel/services/music";

export async function GET(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    return ok({ tracks: await searchTracks(q.slice(0, 100)) });
  } catch {
    return bad("Tracks could not be searched", 502);
  }
}

export const dynamic = "force-dynamic";
