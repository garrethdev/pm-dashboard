import { requireSession } from "@/lib/api-auth";
import { callCatalog } from "@/lib/carousel/trends/client";
import { catalogFailure } from "@/lib/carousel/trends/http";

/** Ordered slides and saved construction/layout evidence for the detail drawer. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;
  try { return Response.json(await callCatalog("carousel", (await params).id), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return catalogFailure(error); }
}
