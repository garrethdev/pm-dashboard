import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { callCatalog } from "./client";
import { readSearchBody } from "./http";
import { analysisGroups } from "./analysis";
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "private-key");
  vi.stubEnv("OPENROUTER_API_KEY", "embedding-key");
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.restoreAllMocks(); });
it("calls the existing RPC and removes videos without inventing absent slide media", async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(Response.json([{ reference_id: 1, matched_slide: 2 }, { reference_id: 2 }]))
    .mockResolvedValueOnce(Response.json([{ id: 1, format: "carousel", thumbnail_url: "cover", likes: null }]))
    .mockResolvedValueOnce(Response.json([{ source_reference_id: 1, position: 2 }]));
  const out = await callCatalog("search", { query: "eyes", mode: "keyword" }, fetcher);
  expect(out).toMatchObject({ mode: "keyword", reranked: false, results: [{ reference_id: 1, matched_media: null, reference: { likes: null }, slide_count: 1 }], pagination: { total: null, exhaustive: false } });
  expect(new URL(String(fetcher.mock.calls[2][0])).searchParams.get("select")).toBe("id,source_reference_id,position");
  expect(String(fetcher.mock.calls[0][0])).toContain("/rest/v1/rpc/search_carousel_library");
  expect(String(fetcher.mock.calls[1][0])).toContain("format=eq.carousel");
});
it("embeds and caches normalized queries at the corpus dimensions", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ data: [{ index: 0, embedding: Array(512).fill(0.1) }] }))
    .mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(Response.json([]));
  await callCatalog("search", { query: " CACHE   Test " }, fetcher);
  await callCatalog("search", { query: "cache test" }, fetcher);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ model: "openai/text-embedding-3-small", dimensions: 512, input: ["cache test"] });
});
it("falls back explicitly and logs no query or provider secrets", async () => {
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  const fetcher = vi.fn().mockResolvedValueOnce(new Response("provider secret", { status: 500 })).mockResolvedValueOnce(Response.json([]));
  const out = await callCatalog("search", { query: "fallback specimen" }, fetcher);
  expect(out).toMatchObject({ requested_mode: "hybrid", mode: "keyword", fallback: "embedding_unavailable" });
  expect(log.mock.calls.flat().join()).not.toContain("specimen");
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ p_mode: "keyword", p_embedding: null });
});
it("literal search does not request an embedding", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json([]));
  await callCatalog("search", { query: "exact", channel: "literal" }, fetcher);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ p_exact: true, p_mode: "keyword" });
});
it.each(["../health", "0", "9007199254740992", "1?deep=true"])("rejects unsafe ID %s", async id => {
  const fetcher = vi.fn();
  await expect(callCatalog("source", id, fetcher)).rejects.toMatchObject({ status: 400 });
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([{ rerank: true }, { offset: 25 }, { filters: { owner: "me" } }, { mode: "unknown" }])("rejects unsupported search fields %j", async extra => {
  await expect(callCatalog("search", { query: "test", ...extra }, vi.fn())).rejects.toMatchObject({ status: 400 });
});
it("fails explicitly when database is unconfigured", async () => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  await expect(callCatalog("facets")).rejects.toMatchObject({ status: 503 });
});
it("redacts database error bodies", async () => {
  await expect(callCatalog("facets", undefined, vi.fn().mockResolvedValue(new Response("private details", { status: 500 })))).rejects.toMatchObject({ status: 502, message: "Carousel database request failed." });
});
it("timeouts are distinct from empty results", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => init.signal.addEventListener("abort", () => reject(Error()))));
  const assertion = expect(callCatalog("search", { query: "eyes", mode: "keyword" }, fetcher)).rejects.toMatchObject({ status: 504 });
  await vi.advanceTimersByTimeAsync(20_000); await assertion;
});
it("returns unread references without fabricating analysis", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json([{ id: 1 }])).mockImplementation(() => Promise.resolve(Response.json([])));
  expect(await callCatalog("carousel", "1", fetcher)).toMatchObject({ reading_required: true, analysis: null, slides: [] });
});
it.each(["perez-slides-v1", "phase0-multiformat-v1"])("reads saved %s detail fields without fabricating evidence", async version => {
  const fetcher = vi.fn(async (url: URL | RequestInfo) => {
    const path = String(url);
    if (path.includes("references_unified?")) return Response.json([{ id: 1, format: "carousel" }]);
    if (path.includes("reference_beats?")) return Response.json([{ id: "beat", position: 1, visible_copy: "", narrative_role: "opening_hook", inspection_status: "complete" }]);
    if (path.includes("reference_analysis?")) return Response.json([{ id: "analysis", analysis_version: version, inspection_status: "partial", inferred: { story_structure: "list_with_introduction" }, observed: { coverage: { inspected_images: 1, supplied_images: 3 } } }]);
    return Response.json([]);
  });
  const result = await callCatalog("carousel", "1", fetcher);
  expect(result).toMatchObject({ reading_required: false, analysis: { analysis_version: version, inspection_status: "partial" }, slides: [{ visible_copy: "" }] });
  const analysisUrl = new URL(String(fetcher.mock.calls.find(([url]) => String(url).includes("reference_analysis?"))![0]));
  expect(analysisUrl.searchParams.get("analysis_version")).toBe("in.(perez-slides-v1,phase0-multiformat-v1)");
  expect(analysisUrl.searchParams.get("select")).toContain("inferred,observed");
  expect(analysisUrl.searchParams.get("order")).toBe("updated_at.desc,id.asc");
  const beatsUrl = new URL(String(fetcher.mock.calls.find(([url]) => String(url).includes("reference_beats?"))![0]));
  expect(beatsUrl.searchParams.get("select")).toBe("id,position,visible_copy,visual_description,narrative_role,inspection_status");
});
it.each(["null", "[]", "broken", '{"query":""}', '{"query":"eyes","owner":"me"}'])("rejects malformed request %s", async body => {
  await expect(readSearchBody(new Request("https://dashboard.example", { method: "POST", body }))).rejects.toMatchObject({ status: 400 });
});
it("bounds request bytes without trusting content length", async () => {
  await expect(readSearchBody(new Request("https://dashboard.example", { method: "POST", body: JSON.stringify({ query: "x".repeat(33000) }) }))).rejects.toMatchObject({ status: 413 });
});

it.each(["list_with_introduction", null, "", { unsupported: true }])("uses only a saved phase0 story string: %j", async story => {
  const original = { id: "analysis", analysis_version: "phase0-multiformat-v1", inspection_status: "partial", hook_family: "outcome_preview", inferred: { first_product_slide: 3 } };
  const fetcher = vi.fn(async (url: URL | RequestInfo) => {
    const path = String(url);
    if (path.includes("references_unified?")) return Response.json([{ id: 1 }]);
    if (path.includes("reference_analysis?")) return Response.json([original]);
    if (path.includes("reference_format_evaluations?")) return Response.json([{ story_structure: story, evaluated_at: "2026-09-19T00:00:00Z", hook_strength: 9 }]);
    return Response.json([]);
  });
  const result = await callCatalog("carousel", "1", fetcher);
  expect(result.analysis).toMatchObject(original);
  const query = new URL(String(fetcher.mock.calls.find(([url]) => String(url).includes("reference_format_evaluations?"))![0]));
  expect(query.searchParams.get("source_reference_id")).toBe("eq.1");
  expect(query.searchParams.get("select")).toBe("story_structure,evaluated_at");
  expect(query.searchParams.get("limit")).toBe("1");
  expect(JSON.stringify(result.analysis)).not.toContain("hook_strength");
  const storyRow = analysisGroups(result.analysis ?? null).flatMap(group => group.rows).find(row => row.label === "Story");
  if (typeof story === "string" && story) {
    expect(storyRow?.values).toEqual(["List with introduction"]);
    expect(result.analysis?.story_structure_source).toMatchObject({ relation: "reference_format_evaluations" });
  } else expect(storyRow).toBeUndefined();
});

it.each(["perez-slides-v1", "phase0-multiformat-v1"])("does not replace a saved story for %s", async version => {
  const fetcher = vi.fn(async (url: URL | RequestInfo) => {
    const path = String(url);
    if (path.includes("references_unified?")) return Response.json([{ id: 1 }]);
    if (path.includes("reference_analysis?")) return Response.json([{ analysis_version: version, inferred: { story_structure: "original" } }]);
    return Response.json([]);
  });
  expect((await callCatalog("carousel", "1", fetcher)).analysis?.inferred).toEqual({ story_structure: "original" });
  expect(fetcher.mock.calls.some(([url]) => String(url).includes("reference_format_evaluations?"))).toBe(false);
});
