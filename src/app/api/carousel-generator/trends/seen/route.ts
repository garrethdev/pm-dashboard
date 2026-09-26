import { bad, body, guard, ok } from "@/server/carousel/http";
import { markSeen } from "@/server/carousel/repo/trends";

/** Seen means on screen for about a second (DEV-45). Batched by the page; also sent on leaving. */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const ids = Array.isArray(b.ids) ? (b.ids as unknown[]).filter((x): x is number => Number.isInteger(x)).slice(0, 200) : [];
  try {
    await markSeen(g.email, ids);
    return ok({ marked: ids.length });
  } catch (err) {
    console.error("carousel seen failed", err);
    return bad("Could not record", 502);
  }
}

export const dynamic = "force-dynamic";
