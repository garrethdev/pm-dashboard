import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/api-auth", () => ({ requireSession: vi.fn() }));
vi.mock("./client", async importOriginal => ({ ...await importOriginal<typeof import("./client")>(), callCatalog: vi.fn() }));
import { requireSession } from "@/lib/api-auth";
import { callCatalog } from "./client";
import { POST } from "@/app/api/carousel-generator/search/route";
import { GET as facets } from "@/app/api/carousel-generator/facets/route";
import { GET as source } from "@/app/api/carousel-generator/sources/[id]/route";
import { GET as carousel } from "@/app/api/carousel-generator/carousels/[id]/route";
import { NextResponse } from "next/server";

beforeEach(() => { vi.clearAllMocks(); vi.mocked(requireSession).mockResolvedValue(null); });
it("blocks all routes before accessing the service", async () => {
  vi.mocked(requireSession).mockResolvedValue(NextResponse.json({ error: "unauthorized" }, { status: 401 }));
  const req = new Request("https://dashboard.example");
  const params = { params: Promise.resolve({ id: "42" }) };
  for (const response of await Promise.all([POST(req), facets(), source(req, params), carousel(req, params)])) expect(response.status).toBe(401);
  expect(callCatalog).not.toHaveBeenCalled();
});
it("passes an authenticated search through without changing retrieval semantics", async () => {
  vi.mocked(callCatalog).mockResolvedValue({ query: "eyes", channel: "meaning", requested_mode: "hybrid", mode: "hybrid", fallback: null, reranked: false, results: [], pagination: { returned: 0, limit: 25, candidate_limit: 50, total: null, exhaustive: false } });
  const response = await POST(new Request("https://dashboard.example", { method: "POST", body: '{"query":"eyes"}' }));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(callCatalog).toHaveBeenCalledWith("search", { query: "eyes" });
});
