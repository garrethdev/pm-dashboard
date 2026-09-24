import { requireSession } from "@/lib/api-auth";
import { callCatalog } from "@/lib/carousel/trends/client";
import { catalogFailure } from "@/lib/carousel/trends/http";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try { return Response.json(await callCatalog("facets"), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return catalogFailure(error); }
}
