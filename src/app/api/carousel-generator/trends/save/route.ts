import { attempt, bad, body, guard } from "@/server/carousel/http";
import { toggleSave } from "@/server/carousel/repo/trends";

/** Save is personal (DEV-37): who saved it comes from the session, never the body. */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const id = Number(b.id);
  if (!Number.isInteger(id)) return bad("id is required");
  return attempt(g.email, "carousel.reference.save", String(id), async () => ({ saved: await toggleSave(g.email, id) }));
}

export const dynamic = "force-dynamic";
