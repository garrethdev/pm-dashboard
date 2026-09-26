import { attempt, bad, body, guard, str } from "@/server/carousel/http";
import { castVote } from "@/server/carousel/repo/trends";

/** A vote approves nothing (DEV-44). Pressing the same thumb again takes it back. */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const id = Number(b.id);
  if (!Number.isInteger(id)) return bad("id is required");
  const vote = b.vote === "up" || b.vote === "down" ? b.vote : null;
  return attempt(g.email, "carousel.reference.vote", String(id), async () => ({ vote: await castVote(g.email, id, vote, str(b.query, 300) || null) }), { vote });
}

export const dynamic = "force-dynamic";
