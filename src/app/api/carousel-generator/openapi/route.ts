import { requireSession } from "@/lib/api-auth";
import { carouselOpenApi } from "@/lib/carousel/openapi";

/** Downloadable contract for Swagger, Postman or client generation; session protected. */
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  return Response.json(carouselOpenApi, { headers: { "Cache-Control": "no-store" } });
}
