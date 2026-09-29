import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireSession } from "@/lib/api-auth";

export const runtime = "nodejs";
/** Exact allowlist prevents the documentation endpoint becoming a file server. */
export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;
  const { asset } = await params;
  if (!["swagger-ui.css", "swagger-ui-bundle.js", "init.js"].includes(asset)) return new Response(null, { status: 404 });
  const body = asset === "init.js"
    ? `SwaggerUIBundle({url:'/api/carousel-generator/openapi',dom_id:'#swagger-ui',validatorUrl:null,persistAuthorization:false,queryConfigEnabled:false,supportedSubmitMethods:['get','post'],tryItOutEnabled:false,requestInterceptor:function(req){req.credentials='same-origin';return req;}});`
    : await readFile(path.join(process.cwd(), "node_modules/swagger-ui-dist", asset), "utf8");
  return new Response(body, { headers: { "Content-Type": asset.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
