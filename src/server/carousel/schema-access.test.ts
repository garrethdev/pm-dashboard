import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GENERATION_RELATIONS, probeGenerationAccess } from "./schema-access";
beforeEach(() => { vi.stubEnv("SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-secret"); });
afterEach(() => vi.unstubAllEnvs());
describe("generation schema access probe", () => {
  it("does not send any requests without configuration", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const fetcher = vi.fn<typeof fetch>();
    expect(await probeGenerationAccess(fetcher)).toEqual({ configured: false, checks: [], schemaVerified: false });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("only requests zero rows and never certifies the schema", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json([]));
    const result = await probeGenerationAccess(fetcher);
    expect(result.checks).toHaveLength(GENERATION_RELATIONS.length);
    expect(result.checks.every(c => c.access === "reachable")).toBe(true);
    expect(result.schemaVerified).toBe(false);
    for (const [url, init] of fetcher.mock.calls) {
      expect(new URL(String(url)).searchParams.get("limit")).toBe("0");
      expect(init).toMatchObject({ method: "GET", redirect: "error", cache: "no-store" });
      expect(init?.body).toBeUndefined();
    }
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });
  it("does not call inaccessible tables missing", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response("private details", { status: 404 }));
    const result = await probeGenerationAccess(fetcher);
    expect(result.checks.every(c => c.access === "unverified")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("private details");
  });
  it("does not expose unexpected rows", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json([{ secret: "private row" }]));
    const result = await probeGenerationAccess(fetcher);
    expect(result.checks.every(c => c.access === "unexpected_response")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("private row");
  });
  it("refuses credential-bearing URLs", async () => {
    vi.stubEnv("SUPABASE_URL", "https://user:password@example.com");
    const fetcher = vi.fn<typeof fetch>();
    await expect(probeGenerationAccess(fetcher)).rejects.toThrow("configuration");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
