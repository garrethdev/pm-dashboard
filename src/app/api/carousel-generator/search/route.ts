import { requireSession } from "@/lib/api-auth";
import { callCatalog } from "@/lib/carousel/trends/client";
import { catalogFailure, readSearchBody } from "@/lib/carousel/trends/http";

/** Session-gated bridge to saved analysis. Does not scrape, generate or approve. */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    return Response.json(await callCatalog("search", await readSearchBody(request)), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return catalogFailure(error); }
}
