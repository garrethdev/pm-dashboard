import { requireSession } from "@/lib/api-auth";

/** Self-hosted Swagger: no CDN, remote validator or credential persistence. */
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Carousel API documentation</title>
<link rel="stylesheet" href="/api/carousel-generator/docs/assets/swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="/api/carousel-generator/docs/assets/swagger-ui-bundle.js"></script>
<script src="/api/carousel-generator/docs/assets/init.js"></script></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" },
  });
}
