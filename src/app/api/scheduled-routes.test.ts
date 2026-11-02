import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The routes nobody watches: the schedules in vercel.json, the phone robot's
// screen reader, and the warmup script's check-in and close. Each is let past
// the sign-in gate in proxy.ts, so its own token check is the only lock, and
// each writes state with nobody looking. The work they call is replaced here;
// what is pinned is the door, the way the request is read, and what a failure
// looks like to the caller.

const copyOutstanding = vi.fn();
const runFacebookIngest = vi.fn();
const runContentTags = vi.fn();
const runReadings = vi.fn();
const checkIn = vi.fn();
const closeRun = vi.fn();

vi.mock("@/server/carousel/services/slide-copies", () => ({ copyOutstanding: (...a: unknown[]) => copyOutstanding(...a) }));
vi.mock("@/server/facebook-analytics", () => ({ runFacebookIngest: (...a: unknown[]) => runFacebookIngest(...a) }));
vi.mock("@/server/content-tags", () => ({ DEFAULT_LIMIT: 50, runContentTags: (...a: unknown[]) => runContentTags(...a) }));
vi.mock("@/server/screen-readings", () => ({
  AiUnavailable: class AiUnavailable extends Error {},
  parseRunRequest: (b: unknown) => {
    if (!b || typeof b !== "object" || !Array.isArray((b as { posts?: unknown }).posts)) throw new Error("posts is missing");
    return b;
  },
  runReadings: (...a: unknown[]) => runReadings(...a),
}));
vi.mock("@/lib/data/warmup-runs", async (orig) => ({
  ...(await orig<typeof import("@/lib/data/warmup-runs")>()),
  checkIn: (...a: unknown[]) => checkIn(...a),
  closeRun: (...a: unknown[]) => closeRun(...a),
}));

import { GET as copySlides } from "./carousel-generator/maintenance/copy-slides/route";
import { GET as facebookIngest } from "./facebook-analytics/ingest/route";
import { GET as contentTags } from "./content-tags/run/route";
import { POST as screenReadings } from "./screen-readings/run/route";
import { POST as runCheckIn } from "./warmup-runner/runs/check-in/route";
import { POST as runClose } from "./warmup-runner/runs/close/route";

const SECRET = "cron-secret";
const RUNNER = "runner-secret";
const bearer = (t?: string): Record<string, string> => (t ? { authorization: `Bearer ${t}` } : {});
const get = (path: string, token?: string) => new Request(`https://dash.test${path}`, { headers: bearer(token) });
const post = (path: string, body: unknown, token?: string) =>
  new Request(`https://dash.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(token) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.stubEnv("WARMUP_RUNNER_TOKEN", RUNNER);
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const m of [copyOutstanding, runFacebookIngest, runContentTags, runReadings, checkIn, closeRun]) m.mockReset().mockResolvedValue({ done: true });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const SCHEDULED: [string, (r: Request) => Promise<Response>, string, () => Request, ReturnType<typeof vi.fn>][] = [
  ["copy-slides", copySlides, "GET", () => get("/api/carousel-generator/maintenance/copy-slides"), copyOutstanding],
  ["facebook ingest", facebookIngest, "GET", () => get("/api/facebook-analytics/ingest"), runFacebookIngest],
  ["content tags", contentTags, "GET", () => get("/api/content-tags/run"), runContentTags],
  ["screen readings", screenReadings, "POST", () => post("/api/screen-readings/run", { posts: [] }), runReadings],
];

describe.each(SCHEDULED)("%s: the door", (_name, handler, _m, make, work) => {
  const withToken = (token?: string) => {
    const base = make();
    const headers = new Headers(base.headers);
    headers.delete("authorization");
    if (token) headers.set("authorization", `Bearer ${token}`);
    return new Request(base.url, { method: base.method, headers, body: base.method === "GET" ? undefined : JSON.stringify({ posts: [] }) });
  };
  it("is shut, with a 503, when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await handler(withToken(SECRET))).status).toBe(503);
    expect(work).not.toHaveBeenCalled();
  });
  it("refuses no token and a wrong token, and does no work", async () => {
    expect((await handler(withToken())).status).toBe(401);
    expect((await handler(withToken("nope"))).status).toBe(401);
    expect(work).not.toHaveBeenCalled();
  });
  it("lets the right token through", async () => {
    expect((await handler(withToken(SECRET))).status).toBe(200);
    expect(work).toHaveBeenCalledTimes(1);
  });
});

describe("copy-slides", () => {
  it("defaults to 45 seconds and never goes past 270", async () => {
    await copySlides(get("/api/carousel-generator/maintenance/copy-slides", SECRET));
    expect(copyOutstanding).toHaveBeenLastCalledWith({ budgetMs: 45_000 });
    await copySlides(get("/api/carousel-generator/maintenance/copy-slides?seconds=9999", SECRET));
    expect(copyOutstanding).toHaveBeenLastCalledWith({ budgetMs: 270_000 });
    await copySlides(get("/api/carousel-generator/maintenance/copy-slides?seconds=abc", SECRET));
    expect(copyOutstanding).toHaveBeenLastCalledWith({ budgetMs: 45_000 });
  });
  it("answers a failure with a 500 and the reason", async () => {
    copyOutstanding.mockRejectedValue(new Error("storage down"));
    const res = await copySlides(get("/api/carousel-generator/maintenance/copy-slides", SECRET));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "storage down" });
  });
});

describe("facebook ingest", () => {
  it("passes the mode only when it is full or light", async () => {
    await facebookIngest(get("/api/facebook-analytics/ingest?mode=full", SECRET));
    expect(runFacebookIngest).toHaveBeenLastCalledWith("full");
    await facebookIngest(get("/api/facebook-analytics/ingest?mode=heavy", SECRET));
    expect(runFacebookIngest).toHaveBeenLastCalledWith(undefined);
  });
  it("answers a failure with a 500", async () => {
    runFacebookIngest.mockRejectedValue(new Error("scrapecreators 402"));
    expect((await facebookIngest(get("/api/facebook-analytics/ingest", SECRET))).status).toBe(500);
  });
});

describe("content tags", () => {
  it("clamps the limit to 200, ignores nonsense, and reads dry=1", async () => {
    await contentTags(get("/api/content-tags/run?limit=5000", SECRET));
    expect(runContentTags).toHaveBeenLastCalledWith(200, false);
    await contentTags(get("/api/content-tags/run?limit=-3&dry=1", SECRET));
    expect(runContentTags).toHaveBeenLastCalledWith(50, true);
    await contentTags(get("/api/content-tags/run?limit=12", SECRET));
    expect(runContentTags).toHaveBeenLastCalledWith(12, false);
  });
});

describe("screen readings", () => {
  it("rejects a body it cannot read with a 400 and does no work", async () => {
    const res = await screenReadings(post("/api/screen-readings/run", { nothing: true }, SECRET));
    expect(res.status).toBe(400);
    expect(runReadings).not.toHaveBeenCalled();
  });
  it("rejects a body that is not JSON with a 400", async () => {
    expect((await screenReadings(post("/api/screen-readings/run", "{oops", SECRET))).status).toBe(400);
  });
  it("passes dry through", async () => {
    await screenReadings(post("/api/screen-readings/run?dry=1", { posts: [] }, SECRET));
    expect(runReadings).toHaveBeenLastCalledWith({ posts: [] }, { dry: true });
  });
  it("answers 503 when the AI is unavailable and 500 for anything else", async () => {
    const { AiUnavailable } = await import("@/server/screen-readings");
    runReadings.mockRejectedValueOnce(new AiUnavailable("no key"));
    expect((await screenReadings(post("/api/screen-readings/run", { posts: [] }, SECRET))).status).toBe(503);
    runReadings.mockRejectedValueOnce(new Error("boom"));
    expect((await screenReadings(post("/api/screen-readings/run", { posts: [] }, SECRET))).status).toBe(500);
  });
});

describe("warmup runner check-in and close", () => {
  const key = { accountId: 12, sessionNo: 1, startedAt: "2026-10-31T10:00:00Z" };

  it.each([
    ["check-in", runCheckIn, "/api/warmup-runner/runs/check-in", key],
    ["close", runClose, "/api/warmup-runner/runs/close", { ...key, endedAt: "2026-10-31T10:20:00Z", note: "" }],
  ] as const)("%s refuses a missing or wrong runner token and does no work", async (_n, handler, path, body) => {
    expect((await handler(post(path, body))).status).toBe(401);
    expect((await handler(post(path, body, SECRET))).status).toBe(401); // the cron token is not the runner token
    expect(checkIn).not.toHaveBeenCalled();
    expect(closeRun).not.toHaveBeenCalled();
  });

  it("is shut when WARMUP_RUNNER_TOKEN is not configured", async () => {
    vi.stubEnv("WARMUP_RUNNER_TOKEN", "");
    expect((await runCheckIn(post("/api/warmup-runner/runs/check-in", key, RUNNER))).status).toBe(503);
  });

  it("check-in records the run it was told about", async () => {
    checkIn.mockResolvedValue({ id: 5 });
    const res = await runCheckIn(post("/api/warmup-runner/runs/check-in", key, RUNNER));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, run: { id: 5 } });
    expect(checkIn).toHaveBeenCalledTimes(1);
  });

  it("check-in rejects a body that is not JSON, and a key that is incomplete, before touching a run", async () => {
    expect((await runCheckIn(post("/api/warmup-runner/runs/check-in", "{oops", RUNNER))).status).toBe(400);
    const res = await runCheckIn(post("/api/warmup-runner/runs/check-in", { accountId: 12 }, RUNNER));
    expect(res.status).toBe(400);
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("close rejects an endedAt that is not a date before touching a run", async () => {
    const res = await runClose(post("/api/warmup-runner/runs/close", { ...key, endedAt: "yesterday-ish", note: "" }, RUNNER));
    expect(res.status).toBe(400);
    expect(closeRun).not.toHaveBeenCalled();
  });

  it("close passes the normalised end time and the note through", async () => {
    closeRun.mockResolvedValue({ closed: true });
    const res = await runClose(post("/api/warmup-runner/runs/close", { ...key, endedAt: "2026-10-31T10:20:00Z", note: "stopped early" }, RUNNER));
    expect(res.status).toBe(200);
    expect(closeRun).toHaveBeenCalledWith(expect.anything(), "2026-10-31T10:20:00.000Z", "stopped early");
  });
});
