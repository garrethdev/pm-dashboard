/** Implemented routes only. This specification is not a deployment/completion receipt. */
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const text = { type: "string" };
const nullableText = { type: "string", nullable: true };
const looseObject = { type: "object", additionalProperties: true };
const jsonValue = { description: "Persisted JSON; shape varies by analysis run and may be null." };
const error = (description: string) => ({ description, content: { "application/json": { schema: ref("Error") } } });
const success = (name: string) => ({ description: "Success. Cache-Control: no-store.", content: { "application/json": { schema: ref(name) } } });
const commonErrors = {
  "307": { description: "The existing dashboard proxy may redirect unauthenticated requests to /login before reaching the route." },
  "401": { description: "Route session check failed.", content: { "application/json": { schema: { type: "object", required: ["error"], properties: { error: { type: "string", enum: ["unauthorized"] } } } } } },
  "422": error("Catalog scan exceeded its supported size."),
  "502": error("Database/provider failure; internal details are redacted."),
  "503": error("Server configuration is missing or invalid."),
  "504": error("The total 20-second deadline expired. This is not an empty result."),
};
function detail(carouselOnly: boolean) {
  return { get: {
    tags: ["Details"], operationId: carouselOnly ? "getCarousel" : "getSource",
    summary: carouselOnly ? "Read saved carousel details" : "Read format-neutral saved source details",
    description: `${carouselOnly ? "Requires format=carousel." : "No format restriction; not a video-conversion endpoint."} Returns ordered beats, perez-slides-v1 summary and enabled search documents. Missing analysis gives analysis=null and reading_required=true. Model observations are not proven causation or human approval. Render stored text as plain text.`,
    parameters: [{ name: "id", in: "path", required: true, description: "Positive reference ID, not a UUID; maximum 9007199254740991.", schema: { type: "string", pattern: "^[1-9][0-9]{0,15}$" }, example: "42" }],
    responses: { "200": success("DetailResponse"), "400": error("Invalid reference ID."), "404": error("Reference absent or wrong format for carousel endpoint."), ...commonErrors },
  } };
}

export const carouselOpenApi = {
  openapi: "3.0.3",
  info: { title: "PM Dashboard — Carousel Backend", version: "0.1.0", description: "Feature-branch implementation, not deployed/live-verified completion. Sign into this dashboard before Try it out. Batch generation, template CRUD, rendering, approval, ingestion, feed and saves/votes APIs are not implemented and intentionally omitted. Query embeddings can incur provider cost." },
  servers: [{ url: "/", description: "Same dashboard origin (local or preview)." }],
  tags: [{ name: "Search" }, { name: "Details" }, { name: "Types" }],
  security: [{ dashboardSession: [] }],
  paths: {
    "/api/carousel-generator/types": { get: {
      tags: ["Types"], operationId: "listCarouselTypes", summary: "List carousel entries from the content registry",
      description: "Read-only, all lifecycle states. Registry string keys are not generator UUIDs. Does not infer template, Writing, library or batch readiness from posting configuration.",
      responses: {
        "200": success("TypesResponse"),
        "401": commonErrors["401"],
        "307": commonErrors["307"],
        "502": { description: "Registry unavailable; retry, not an empty catalog.", content: { "application/json": { schema: { type: "object", required: ["error"], properties: { error: text } } } } },
      },
    } },
    "/api/carousel-generator/search": { post: {
      tags: ["Search"], operationId: "searchCarousels", summary: "Search saved carousel evidence",
      description: "Direct Supabase search; no reranking. Literal channel forces exact keyword mode. Embedding failure yields explicit keyword fallback. Retrieves 50 candidates then filters to carousel format and returns at most 25. This is not a feed, exhaustive total or paginated search. No query-ID/feedback write or ingestion occurs.",
      requestBody: { required: true, description: "Maximum 32 KiB of actual request bytes.", content: { "application/json": { schema: ref("SearchRequest"), examples: { meaning: { value: { query: "tired eyes", channel: "meaning", mode: "hybrid", limit: 25 } }, literal: { value: { query: "morning routine", channel: "literal", exact: true } } } } } },
      responses: { "200": success("SearchResponse"), "400": error("Invalid body, field, filter or value."), "413": error("Request exceeds 32 KiB."), ...commonErrors },
    } },
    "/api/carousel-generator/facets": { get: {
      tags: ["Search"], operationId: "getCarouselFacets", summary: "Read topic and hook-family options",
      description: "Distinct nonempty values from perez-slides-v1 analysis rows. Currently not restricted by reference format. Hook families are exposed but hook-family search filtering is not yet implemented.",
      responses: { "200": success("FacetsResponse"), ...commonErrors },
    } },
    "/api/carousel-generator/carousels/{id}": detail(true),
    "/api/carousel-generator/sources/{id}": detail(false),
  },
  components: {
    securitySchemes: { dashboardSession: { type: "apiKey", in: "cookie", name: "sb-<project-ref>-auth-token", description: "Placeholder cookie name: Supabase SSR uses a project-specific name and may split it into numbered chunks. Sign into the same dashboard first; Swagger cannot set the session cookie. Never enter Supabase service-role or provider keys here." } },
    schemas: {
      TypesResponse: { type: "object", required: ["types"], properties: { types: { type: "array", items: { type: "object", required: ["id", "name", "character", "lifecycle"], properties: { id: text, name: text, character: text, lifecycle: text } } } } },
      Error: { type: "object", required: ["error"], properties: { error: { type: "object", required: ["code", "message"], properties: { code: text, message: text } } } },
      SearchRequest: { type: "object", additionalProperties: false, required: ["query"], properties: {
        query: { type: "string", minLength: 1, maxLength: 1000, pattern: "\\S" },
        channel: { type: "string", enum: ["meaning", "literal", "construction", "visual", "comments"], default: "meaning" },
        mode: { type: "string", enum: ["hybrid", "keyword", "semantic"], default: "hybrid" },
        exact: { type: "boolean", default: false }, limit: { type: "integer", minimum: 1, maximum: 25, default: 25 },
        offset: { type: "integer", enum: [0], description: "Only zero is accepted; no pagination." },
        rerank: { type: "boolean", enum: [false] },
        filters: { type: "object", additionalProperties: false, properties: { creator: { ...text, maxLength: 200 }, topic: { ...text, maxLength: 200 }, audience: { ...text, maxLength: 200 } } },
      } },
      Reference: { ...looseObject, required: ["id"], properties: {
        id: { type: "integer", minimum: 1, maximum: 9007199254740991 }, format: nullableText, creator_handle: nullableText,
        platform: nullableText, source_url: nullableText, thumbnail_url: nullableText, published_at: nullableText,
        views: { type: "number", nullable: true }, likes: { type: "number", nullable: true }, saves: { type: "number", nullable: true },
      } },
      SearchResult: { ...looseObject, description: "Original RPC match fields plus dashboard enrichment. RPC-specific fields are preserved.", required: ["reference", "matched_media", "slide_count"], properties: {
        reference_id: { type: "integer" }, matched_slide: { type: "integer", nullable: true }, score: { type: "number" },
        reference: ref("Reference"), matched_media: jsonValue, thumbnail_url: nullableText,
        slide_count: { type: "integer", minimum: 0, description: "Stored beat count, not verified original slide completeness." },
      } },
      SearchResponse: { type: "object", required: ["query", "channel", "requested_mode", "mode", "fallback", "reranked", "results", "pagination"], properties: {
        query: text, channel: text, requested_mode: text, mode: { type: "string", enum: ["keyword", "hybrid", "semantic"] },
        fallback: { type: "string", nullable: true, enum: ["embedding_unavailable", null] }, reranked: { type: "boolean", enum: [false] },
        results: { type: "array", items: ref("SearchResult") },
        pagination: { type: "object", required: ["returned", "limit", "candidate_limit", "total", "exhaustive"], properties: {
          returned: { type: "integer", minimum: 0, maximum: 25 }, limit: { type: "integer", minimum: 1, maximum: 25 },
          candidate_limit: { type: "integer", enum: [50] }, total: { type: "integer", nullable: true, enum: [null] }, exhaustive: { type: "boolean", enum: [false] },
        } },
      } },
      FacetsResponse: { type: "object", required: ["topics", "hook_families"], properties: { topics: { type: "array", items: text }, hook_families: { type: "array", items: text } } },
      Beat: { ...looseObject, properties: { id: text, position: { type: "integer" }, media: jsonValue, visual: jsonValue, visible_copy: nullableText, visual_description: nullableText, inspection_status: nullableText } },
      Document: { ...looseObject, properties: { id: text, slide_position: { type: "integer", nullable: true }, kind: text, evidence_class: text, content: text, metadata: jsonValue, inspection_status: nullableText } },
      DetailResponse: { type: "object", required: ["reference", "slides", "analysis", "documents", "reading_required", "evidence_scope"], properties: {
        reference: ref("Reference"), slides: { type: "array", items: ref("Beat") },
        analysis: { ...looseObject, nullable: true, description: "perez-slides-v1 summary, or null.", properties: { id: text, analysis_version: text, inspection_status: nullableText, topic: nullableText, hook_family: nullableText, updated_at: nullableText } },
        documents: { type: "array", items: ref("Document") }, reading_required: { type: "boolean" }, evidence_scope: { type: "string", enum: ["external_market_reference"] },
      } },
    },
  },
};
