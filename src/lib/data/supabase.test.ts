import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PGRST_MAX_ROWS, sbRestAll } from "@/lib/data/supabase";

/**
 * Paging, which is the 2026-09-09 external review's #7.
 *
 * The failure being guarded against is a quiet one: PostgREST answers 200 with
 * exactly 1000 rows and nothing to say it truncated, so a total summed over the
 * result is simply wrong and looks fine. These tests stand in a fake `fetch`
 * that behaves the way the real endpoint does, including the cap.
 */

const ORIGINAL_FETCH = globalThis.fetch;

/** Rows 0..n-1, so a test can tell exactly which slice it was handed. */
function rows(n: number): { i: number }[] {
  return Array.from({ length: n }, (_, i) => ({ i }));
}

/**
 * A fake PostgREST holding `total` rows, honouring limit/offset and capping
 * every response at `cap` the way the live one does.
 */
function fakePostgrest(total: number, cap = PGRST_MAX_ROWS) {
  const calls: { limit: number; offset: number }[] = [];

  const fetchMock = vi.fn(async (url: string) => {
    const q = new URL(url).searchParams;
    const limit = Math.min(Number(q.get("limit") ?? cap), cap);
    const offset = Number(q.get("offset") ?? 0);
    calls.push({ limit, offset });
    const page = rows(total).slice(offset, offset + limit);
    return {
      ok: true,
      status: 200,
      json: async () => page,
    } as unknown as Response;
  });

  return { fetchMock, calls };
}

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("sbRestAll", () => {
  it("returns everything when it fits in one page", async () => {
    const { fetchMock, calls } = fakePostgrest(203);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sbRestAll<{ i: number }>("tt_post_performance?select=views");

    expect(result).toHaveLength(203);
    // A short page means the end of the data, so it must not ask again.
    expect(calls).toHaveLength(1);
  });

  it("pages past the 1000-row cap instead of truncating", async () => {
    // 2,357 is the live row count of tt_post_performance on 2026-09-11. A plain
    // read of it returns 1000 rows and says nothing about the other 1,357.
    const { fetchMock, calls } = fakePostgrest(2357);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sbRestAll<{ i: number }>("tt_post_performance?select=views");

    expect(result).toHaveLength(2357);
    expect(calls).toEqual([
      { limit: 1000, offset: 0 },
      { limit: 1000, offset: 1000 },
      { limit: 1000, offset: 2000 },
    ]);
  });

  it("returns the rows in order, with none repeated or dropped", async () => {
    const { fetchMock } = fakePostgrest(2500);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sbRestAll<{ i: number }>("post_performance?select=views");

    expect(result.map((r) => r.i)).toEqual(Array.from({ length: 2500 }, (_, i) => i));
  });

  it("asks once more when the last page lands exactly on the cap", async () => {
    // A full page is not proof of the end. 2000 rows means two full pages and
    // a third that comes back empty; stopping at the second would be right by
    // luck here and wrong at 2001.
    const { fetchMock, calls } = fakePostgrest(2000);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sbRestAll<{ i: number }>("post_performance?select=views");

    expect(result).toHaveLength(2000);
    expect(calls).toHaveLength(3);
  });

  it("puts its paging on a path that already has a query string", async () => {
    const { fetchMock } = fakePostgrest(10);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await sbRestAll("tt_post_performance?select=views&account=eq.someone");

    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("account=eq.someone");
    expect(url).toContain("limit=1000");
    expect(url).toContain("offset=0");
    expect(url.match(/\?/g)).toHaveLength(1);
  });

  it("throws rather than returning a partial answer at the ceiling", async () => {
    // The whole point. A read that has grown past anything expected is worth an
    // error; a silent prefix is the bug.
    const { fetchMock } = fakePostgrest(5000);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      sbRestAll("tt_post_performance?select=views", { maxRows: 2000 }),
    ).rejects.toThrow(/refusing to return a partial answer/);
  });

  it("never asks for more than the cap in one page", async () => {
    const { fetchMock, calls } = fakePostgrest(3000);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await sbRestAll("post_performance?select=views", { pageSize: 99_999 });

    expect(calls.every((c) => c.limit <= PGRST_MAX_ROWS)).toBe(true);
  });

  it("surfaces an upstream failure rather than swallowing it", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    await expect(sbRestAll("post_performance?select=views")).rejects.toThrow(/503/);
  });
});
