import { bad, guard, ok } from "@/server/carousel/http";
import { listDigests } from "@/server/carousel/repo/trends";

export async function GET() {
  const g = await guard();
  if (g.denied) return g.denied;
  try {
    return ok({ digests: await listDigests(g.email) });
  } catch (err) {
    console.error("carousel digests failed", err);
    return bad("Digests could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
