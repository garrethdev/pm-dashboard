import { bad, guard, ok } from "@/server/carousel/http";
import { logError } from "@/server/carousel/log";
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
    // The last carousel already shown; the server reads its place in the order itself.
    const id = Number(url.searchParams.get("afterId"));
    return ok(await unseenFeed(g.email, Number.isInteger(id) && id > 0 ? id : null));
  } catch (err) {
    logError("trends feed", err);
    return bad("The feed could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
