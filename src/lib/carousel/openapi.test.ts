import { beforeEach, expect, it, vi } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { carouselOpenApi } from "./openapi";
vi.mock("@/lib/api-auth", () => ({ requireSession: vi.fn() }));
import { requireSession } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import { GET as spec } from "@/app/api/carousel-generator/openapi/route";
import { GET as docs } from "@/app/api/carousel-generator/docs/route";
import { GET as asset } from "@/app/api/carousel-generator/docs/assets/[asset]/route";

beforeEach(() => { vi.mocked(requireSession).mockResolvedValue(null); });
it("validates as OpenAPI without resolving external references", async () => {
  const parsed = await SwaggerParser.validate(JSON.parse(JSON.stringify(carouselOpenApi)), { resolve: { external: false } });
  expect(parsed.info.title).toContain("Carousel");
});
it("documents exactly the implemented business endpoints", () => {
  expect(Object.keys(carouselOpenApi.paths).sort()).toEqual([
    "/api/carousel-generator/carousels/{id}", "/api/carousel-generator/facets",
    "/api/carousel-generator/search", "/api/carousel-generator/sources/{id}",
    "/api/carousel-generator/types",
  ]);
  expect(carouselOpenApi.components.schemas.SearchRequest.properties.limit.maximum).toBe(25);
  expect(carouselOpenApi.components.schemas.SearchRequest.properties.rerank.enum).toEqual([false]);
});
it("protects spec, UI and assets with the existing session gate", async () => {
  vi.mocked(requireSession).mockResolvedValue(NextResponse.json({ error: "unauthorized" }, { status: 401 }));
  const responses = await Promise.all([spec(), docs(), asset(new Request("http://localhost"), { params: Promise.resolve({ asset: "swagger-ui.css" }) })]);
  expect(responses.map(r => r.status)).toEqual([401, 401, 401]);
});
it("serves a downloadable contract and a local-only UI", async () => {
  expect(await (await spec()).json()).toEqual(carouselOpenApi);
  const response = await docs();
  const html = await response.text();
  expect(html).toContain("/api/carousel-generator/docs/assets/swagger-ui-bundle.js");
  expect(html).not.toContain("https://");
  expect(response.headers.get("content-security-policy")).toContain("connect-src 'self'");
});
it.each(["swagger-ui.css", "swagger-ui-bundle.js", "init.js"])("serves bundled %s", async name => {
  const response = await asset(new Request("http://localhost"), { params: Promise.resolve({ asset: name }) });
  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body.length).toBeGreaterThan(100);
  if (name === "init.js") {
    expect(body).toContain("validatorUrl:null");
    expect(body).toContain("persistAuthorization:false");
  }
});
it("rejects arbitrary asset paths", async () => {
  const response = await asset(new Request("http://localhost"), { params: Promise.resolve({ asset: "../../.env.local" }) });
  expect(response.status).toBe(404);
});
