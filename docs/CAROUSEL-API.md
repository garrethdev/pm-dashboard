# Carousel API — Swagger / OpenAPI

Status: feature-branch documentation for implemented routes, not a claim that
the complete backend or new designs are implemented or deployed.

## Open the documentation

Start the dashboard with `npm run dev` and sign in with an allowed account.
On that same origin, open:

- `/api/carousel-generator/docs` — interactive Swagger UI.
- `/api/carousel-generator/openapi` — OpenAPI 3.0.3 JSON; save this response
  to import into Postman, Swagger Editor or a client generator.

The same paths work on a configured preview deployment. No production deployment
is implied. Swagger uses the existing dashboard session cookies. The cookie name
in the specification is a placeholder because Supabase uses project-specific,
sometimes chunked names. Do not paste service-role or provider keys into Swagger.
An unauthenticated request may be redirected by the existing proxy to `/login`;
the route-level check returns 401 if reached without a valid session.

Swagger's **Try it out** sends real requests only when Execute is pressed. Search
may spend query-embedding credits. It does not enqueue analysis or generate decks.
UI assets are pinned and served from this app, not a CDN. Remote validation and
authorization persistence are disabled, following the [Swagger configuration
reference](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/).

## Covered endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/carousel-generator/search` | Saved carousel search; 25 results maximum, explicit keyword fallback |
| GET | `/api/carousel-generator/facets` | Topic and hook-family options |
| GET | `/api/carousel-generator/carousels/{id}` | Carousel-only saved details |
| GET | `/api/carousel-generator/sources/{id}` | Format-neutral saved details |

Source of truth: `src/lib/carousel/openapi.ts`. It documents request bodies,
response schemas, nullable evidence, authentication, examples and failure statuses.
Unnormalized saved JSON is explicitly marked; no rigid schema for model metadata
is promised. Render source copy and analysis as plain text.

Batch creation, template CRUD, render workers, approval, Go Live, feed paging,
saves/votes and ingestion are deliberately not listed as implemented endpoints.
Live database signature/dimension verification remains a release gate.

## Maintain and verify

Update the specification alongside route changes. Run `npm test --
src/lib/carousel/openapi.test.ts`, `npm run typecheck`, and the affected route
tests. Specification validation and mocked/session-route tests do not prove live
database compatibility. Locally served asset tests also verify the package files
exist; Vercel tracing explicitly includes both Swagger assets.
