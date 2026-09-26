import { requireSession } from "@/lib/api-auth";
import { callCatalog } from "@/lib/carousel/trends/client";
import { catalogFailure } from "@/lib/carousel/trends/http";

/** Format-neutral saved detail; video conversion proposals are not generated here. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;
  try { return Response.json(await callCatalog("source", (await params).id), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return catalogFailure(error); }
}
