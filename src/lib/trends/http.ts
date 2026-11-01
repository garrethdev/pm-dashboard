import { CatalogError } from "./client";

/** Bound the stream itself, not just the optional/untrusted Content-Length header. */
export async function readSearchBody(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new CatalogError(400, "INVALID_BODY", "Expected a JSON object.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 32_768) {
        await reader.cancel();
        throw new CatalogError(413, "BODY_TOO_LARGE", "Search request exceeds 32 KiB.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw Error();
    const body = data as Record<string, unknown>;
    const allowed = new Set(["query", "channel", "mode", "exact", "limit", "offset", "filters", "rerank"]);
    if (Object.keys(body).some(key => !allowed.has(key))) throw Error();
    if (typeof body.query !== "string" || !body.query.trim() || body.query.length > 1000) throw Error();
    // Detailed enums/filter validation is shared in the database adapter.
    return body;
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    throw new CatalogError(400, "INVALID_BODY", "Invalid search request.");
  } finally { reader.releaseLock(); }
}

export function catalogFailure(error: unknown): Response {
  const safe = error instanceof CatalogError ? error : new CatalogError(502, "CATALOG_UNAVAILABLE", "Carousel search is temporarily unavailable.");
  return Response.json({ error: { code: safe.code, message: safe.message } }, {
    status: safe.status, headers: { "Cache-Control": "no-store" },
  });
}
