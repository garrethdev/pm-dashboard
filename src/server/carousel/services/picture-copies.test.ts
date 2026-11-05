import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbRpc = vi.fn();
const dbInsert = vi.fn();
const r2Put = vi.fn();
vi.mock("@/server/carousel/repo/db", () => ({ dbRpc: (...a: unknown[]) => dbRpc(...a), dbInsert: (...a: unknown[]) => dbInsert(...a) }));
vi.mock("@/server/carousel/log", () => ({ logError: () => {} }));
vi.mock("@/server/r2", async (orig) => ({ ...(await orig<typeof import("@/server/r2")>()), r2Configured: () => true, r2Put: (...a: unknown[]) => r2Put(...a) }));

import { makeOutstandingCopies } from "./picture-copies";

const todo = (path: string, size = 1000) => ({ bucket: "rich-life-images", path, version: "v1", size, mimetype: "image/png", attempts: 0, remaining: 2 });

beforeEach(async () => {
  vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "k");
  const png = await sharp({ create: { width: 1600, height: 2000, channels: 3, background: "#888" } }).png().toBuffer();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(png))));
  dbInsert.mockReset().mockResolvedValue([]);
  r2Put.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("makeOutstandingCopies", () => {
  it("makes both copies, records them as done, and stops when the list is empty", async () => {
    dbRpc.mockReset().mockResolvedValueOnce([todo("c/a.png"), todo("too-big.png", 30_000_000)]).mockResolvedValueOnce([]);
    const report = await makeOutstandingCopies({ budgetMs: 30_000 });
    expect(report).toMatchObject({ made: 1, failed: 1, stoppedFor: "done" });
    expect(r2Put.mock.calls.map((c) => c[0])).toEqual(["rich-life-images/c/a.png/540.webp", "rich-life-images/c/a.png/1080.webp"]);
    const rows = dbInsert.mock.calls.map((c) => c[1][0]);
    expect(rows.find((r) => r.path === "c/a.png")).toMatchObject({ status: "done", version: "v1", attempts: 1 });
    // Too big for Supabase's own resizer too: final, not retried until the original changes.
    expect(rows.find((r) => r.path === "too-big.png")).toMatchObject({ status: "failed", attempts: 99 });
  });
  it("makes no more than the limit and lists what it made", async () => {
    dbRpc.mockReset().mockResolvedValue([todo("c/a.png"), todo("c/b.png")]);
    const report = await makeOutstandingCopies({ budgetMs: 30_000, limit: 1 });
    expect(report.made).toBe(1);
    expect(report.stoppedFor).toBe("limit");
    expect(report.samples?.[0].copies).toHaveLength(2);
  });
});
