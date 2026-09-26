/** DEV-39/47: direct server-to-Supabase adapter, not the undeployed HTTP service. */
export class CatalogError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
export type CatalogOperation = "search" | "facets" | "source" | "carousel";
type Row = Record<string, unknown>;
const MODEL = "openai/text-embedding-3-small";
// Matches the existing corpus worker; verifying live vector dimensions is a release gate.
const DIMENSIONS = 512;
const cache = new Map<string, { expires: number; vector: number[] }>();
const validId = (v: unknown) => typeof v === "string" && /^[1-9]\d{0,15}$/.test(v) && Number.isSafeInteger(Number(v));
const invalid = () => new CatalogError(400, "INVALID_SEARCH", "Invalid search parameters.");

/** One 20-second budget, no reranking, no provider retries and no browser credentials. */
export async function callCatalog(operation: CatalogOperation, input?: unknown, fetcher = fetch) {
  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new CatalogError(503, "CATALOG_NOT_CONFIGURED", "Carousel database is not configured.");
  let origin: URL;
  try {
    origin = new URL(base);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw Error();
  } catch { throw new CatalogError(503, "CATALOG_NOT_CONFIGURED", "Carousel database configuration is invalid."); }
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20_000);
  async function db(path: string, body?: Row): Promise<Row[]> {
    const response = await fetcher(new URL(`/rest/v1/${path}`, origin), {
      method: body ? "POST" : "GET", cache: "no-store", redirect: "error", signal: controller.signal,
      headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new CatalogError(502, "CATALOG_UNAVAILABLE", "Carousel database request failed.");
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || rows.some(r => !r || typeof r !== "object" || Array.isArray(r))) throw Error("Invalid rows");
    return rows;
  }
  async function all(path: string): Promise<Row[]> {
    const rows: Row[] = [];
    for (let offset = 0; offset < 20_000; offset += 500) {
      const page = await db(`${path}&limit=500&offset=${offset}`); rows.push(...page);
      if (page.length < 500) return rows;
    }
    throw new CatalogError(422, "CATALOG_LIMIT", "Catalog read exceeds the supported size.");
  }
  try {
    if (operation === "search") {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
      const b = input as Row;
      if (Object.keys(b).some(k => !["query", "channel", "mode", "exact", "limit", "offset", "filters", "rerank"].includes(k))) throw invalid();
      if (typeof b.query !== "string" || !b.query.trim() || b.query.length > 1000) throw invalid();
      const channel = b.channel ?? "meaning", requestedMode = b.mode ?? "hybrid", limit = b.limit ?? 25;
      if (!["meaning", "literal", "construction", "visual", "comments"].includes(String(channel)) || !["hybrid", "keyword", "semantic"].includes(String(requestedMode))) throw invalid();
      if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > 25 || (b.offset !== undefined && b.offset !== 0) || (b.rerank !== undefined && b.rerank !== false) || (b.exact !== undefined && typeof b.exact !== "boolean")) throw invalid();
      const filters = (b.filters ?? {}) as Row;
      if (!filters || typeof filters !== "object" || Array.isArray(filters) || Object.keys(filters).some(k => !["creator", "topic", "audience"].includes(k)) || Object.values(filters).some(v => typeof v !== "string" || v.length > 200)) throw invalid();
      let mode = channel === "literal" ? "keyword" : requestedMode;
      let vector: number[] | null = null, fallback: string | null = null;
      if (mode !== "keyword") {
        const normalized = b.query.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
        const cached = cache.get(normalized);
        if (cached && cached.expires > Date.now()) vector = cached.vector;
        else {
          try {
            const token = process.env.OPENROUTER_API_KEY;
            if (!token) throw Error("Embedding not configured");
            const response = await fetcher("https://openrouter.ai/api/v1/embeddings", {
              method: "POST", redirect: "error", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]),
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: MODEL, dimensions: DIMENSIONS, input: [normalized], encoding_format: "float" }),
            });
            if (!response.ok) throw Error("Embedding failed");
            const result = await response.json(), candidate: unknown = result.data?.[0]?.embedding;
            if (result.data?.length !== 1 || result.data[0].index !== 0 || !Array.isArray(candidate) || candidate.length !== DIMENSIONS || candidate.some(v => typeof v !== "number" || !Number.isFinite(v))) throw Error("Invalid embedding");
            vector = candidate;
            // Bound per-instance memory; cached queries never enter a browser response.
            if (cache.size >= 128) cache.delete(cache.keys().next().value!);
            cache.set(normalized, { vector, expires: Date.now() + 300_000 });
          } catch {
            if (controller.signal.aborted) throw Error("Timeout");
            mode = "keyword"; fallback = "embedding_unavailable";
            console.warn("carousel_search: embedding unavailable; using keyword search");
          }
        }
      }
      const matches = await db("rpc/search_carousel_library", {
        p_query: b.query.trim(), p_embedding: vector, p_embedding_model: MODEL,
        p_channel: channel, p_mode: mode, p_limit: 50, p_exact: channel === "literal" || b.exact === true,
        p_creator: filters.creator ?? null, p_topic: filters.topic ?? null, p_audience: filters.audience ?? null,
      });
      const ids = [...new Set(matches.map(r => String(r.reference_id)).filter(validId))];
      const refs = ids.length ? await db(`references_unified?format=eq.carousel&id=in.(${ids.join(",")})&select=id,format,creator_handle,platform,source_url,thumbnail_url,views,likes,saves,published_at`) : [];
      const byId = new Map(refs.map(r => [String(r.id), r]));
      const selected = matches.filter(r => byId.has(String(r.reference_id))).slice(0, Number(limit));
      const selectedIds = [...new Set(selected.map(r => String(r.reference_id)))];
      // Live reference_beats has no media/visual columns. Keep real slide counts;
      // do not manufacture matched-slide imagery from the reference's cover.
      const beats = selectedIds.length ? await all(`reference_beats?source_reference_id=in.(${selectedIds.join(",")})&select=id,source_reference_id,position&order=source_reference_id.asc,position.asc,id.asc`) : [];
      return { query: b.query, channel, requested_mode: requestedMode, mode, fallback, reranked: false,
        results: selected.map(match => {
          const reference = byId.get(String(match.reference_id))!;
          const slides = beats.filter(s => String(s.source_reference_id) === String(match.reference_id));
          return { ...match, reference, matched_media: null, thumbnail_url: reference.thumbnail_url, slide_count: slides.length };
        }), pagination: { returned: selected.length, limit, candidate_limit: 50, total: null, exhaustive: false },
      };
    }
    if (operation === "facets") {
      const rows = await all("reference_analysis?analysis_version=eq.perez-slides-v1&select=id,topic,hook_family&order=id.asc");
      return { topics: [...new Set(rows.map(r => r.topic).filter(Boolean))].sort(), hook_families: [...new Set(rows.map(r => r.hook_family).filter(Boolean))].sort() };
    }
    if (!validId(input)) throw new CatalogError(400, "INVALID_REFERENCE", "Invalid reference ID.");
    const refs = await db(`references_unified?id=eq.${input}${operation === "carousel" ? "&format=eq.carousel" : ""}&select=id,format,creator_handle,platform,source_url,thumbnail_url,views,likes,saves,published_at`);
    if (!refs.length) throw new CatalogError(404, "REFERENCE_NOT_FOUND", "Reference not found.");
    const [beats, analysis, documents] = await Promise.all([
      all(`reference_beats?source_reference_id=eq.${input}&select=id,position,visible_copy,visual_description,narrative_role,inspection_status&order=position.asc,id.asc`),
      db(`reference_analysis?source_reference_id=eq.${input}&analysis_version=in.(perez-slides-v1,phase0-multiformat-v1)&select=id,analysis_version,inspection_status,topic,angle,hook_family,emotional_tone,visual_style,opener_treatment,proof_placement,cta_structure,inferred,observed,updated_at&order=updated_at.desc,id.asc&limit=1`),
      all(`carousel_search_documents?source_reference_id=eq.${input}&enabled=eq.true&select=id,slide_position,kind,evidence_class,content,metadata,inspection_status&order=id.asc`),
    ]);
    let savedAnalysis = analysis[0] ?? null;
    const inferred = savedAnalysis?.inferred && typeof savedAnalysis.inferred === "object" && !Array.isArray(savedAnalysis.inferred)
      ? savedAnalysis.inferred as Row : {};
    // DEV-42: the older phase0 run stored Story separately. Read only that saved
    // field, preserving analysis status/coverage and never exposing strength scores.
    if (savedAnalysis?.analysis_version === "phase0-multiformat-v1" && !(typeof inferred.story_structure === "string" && inferred.story_structure.trim())) {
      const evaluations = await db(`reference_format_evaluations?source_reference_id=eq.${input}&select=story_structure,evaluated_at&order=evaluated_at.desc.nullslast&limit=1`);
      const story = evaluations[0]?.story_structure;
      if (typeof story === "string" && story.trim()) {
        savedAnalysis = { ...savedAnalysis, inferred: { ...inferred, story_structure: story },
          story_structure_source: { relation: "reference_format_evaluations", evaluated_at: evaluations[0].evaluated_at ?? null } };
      }
    }
    // Missing analysis is explicit; model text is saved evidence, not human approval.
    return { reference: refs[0], slides: beats, analysis: savedAnalysis, documents, reading_required: !analysis.length, evidence_scope: "external_market_reference" };
  } catch (error) {
    if (controller.signal.aborted) throw new CatalogError(504, "SEARCH_TIMEOUT", "Search exceeded 20 seconds. Try a narrower query.");
    if (error instanceof CatalogError) throw error;
    throw new CatalogError(502, "CATALOG_UNAVAILABLE", "Carousel search is temporarily unavailable.");
  } finally { clearTimeout(timer); }
}
