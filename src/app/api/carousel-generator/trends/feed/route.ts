import { bad, guard, ok } from "@/server/carousel/http";
import { seenFeed, unseenCount, unseenFeed } from "@/server/carousel/repo/trends";

/**
 * The feed (DEV-34, DEV-45): what this person has not seen, best first,
 * keyset-paged; `?seen=1` carries on into what they have seen, most
 * recently seen first; `?count=1` is the poll for new carousels.
 */
export async function GET(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const url = new URL(req.url);
  try {
    if (url.searchParams.get("count")) return ok({ unseen: await unseenCount(g.email) });
    if (url.searchParams.get("seen")) return ok(await seenFeed(g.email, url.searchParams.get("before")));
    const score = url.searchParams.get("afterScore");
    const id = url.searchParams.get("afterId");
    const after = score && id ? { score: Number(score), id: Number(id) } : null;
    return ok(await unseenFeed(g.email, after));
  } catch (err) {
    console.error("carousel feed failed", err);
    return bad("The feed could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
