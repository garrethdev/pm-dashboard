import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HiggsfieldError, SHAPES, SOUL_IMAGE, SOUL_TEXT, awaitImages, generate, isShape, submit } from "./higgsfield";

const API = "https://higgsfield.test";
const PICTURE = "https://cdn.higgsfield.test/out/1.jpg";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

let calls: { url: string; init?: RequestInit }[] = [];
/** What the status poll says on each call, in order. */
let statuses: unknown[] = [];

async function fetchMock(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  calls.push({ url: String(input), init });
  const url = String(input);
  const method = init?.method ?? "GET";
  if (method === "POST" && url.startsWith(`${API}/higgsfield-ai/`)) return json({ request_id: "req-1", status_url: `${API}/requests/req-1/status` });
  if (method === "GET" && url === `${API}/requests/req-1/status`) return json(statuses.shift() ?? { status: "completed", images: [{ url: PICTURE }] });
  if (method === "GET" && url === PICTURE) return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), { status: 200, headers: { "Content-Type": "image/jpeg" } });
  throw new Error(`unexpected ${method} ${url}`);
}

beforeEach(() => {
  process.env.HIGGSFIELD_API_KEY = "key-id:key-secret";
  process.env.HIGGSFIELD_API_URL = API;
  calls = [];
  statuses = [];
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.HIGGSFIELD_API_KEY;
  delete process.env.HIGGSFIELD_API_URL;
});

/** What a call threw, as the error it is. */
async function failure(p: Promise<unknown>): Promise<HiggsfieldError> {
  const err = await p.then(() => null, (e: unknown) => e);
  if (!(err instanceof HiggsfieldError)) throw new Error("expected a HiggsfieldError");
  return err;
}

/** Run a promise that sleeps between polls, advancing the fake clock until it settles. */
async function settle<T>(p: Promise<T>): Promise<T> {
  const done = p.then((v) => ({ v }), (e: unknown) => ({ e }));
  for (let i = 0; i < 200; i++) {
    await vi.advanceTimersByTimeAsync(3_000);
  }
  const r = await done;
  if ("e" in r) throw r.e;
  return r.v;
}

describe("asking Higgsfield for a picture", () => {
  it("submits to Soul 2 from the prompt alone, with the shape and one picture at a time", async () => {
    await submit({ prompt: "A kitchen in morning light", shape: "portrait" });
    const c = calls[0];
    expect(c.url).toBe(`${API}/${SOUL_TEXT}`);
    const headers = c.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Key key-id:key-secret");
    expect(headers["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(String(c.init?.body))).toEqual({ prompt: "A kitchen in morning light", aspect_ratio: "3:4", resolution: "1080p", batch_size: 1, enhance_prompt: true });
  });

  it("switches to image-to-image when a base picture is given", async () => {
    await submit({ prompt: "Same woman, now outdoors", shape: "square", baseImageUrl: "https://pub.test/a.jpg" });
    expect(calls[0].url).toBe(`${API}/${SOUL_IMAGE}`);
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({ image_url: "https://pub.test/a.jpg", aspect_ratio: "1:1" });
  });

  it("knows the three shapes and nothing else", () => {
    expect(SHAPES).toEqual({ portrait: "3:4", tall: "9:16", square: "1:1" });
    expect(isShape("tall")).toBe(true);
    expect(isShape("4:5")).toBe(false);
    expect(isShape(null)).toBe(false);
  });

  it("waits through queued and in progress, then hands back the links", async () => {
    statuses = [{ status: "queued" }, { status: "in_progress" }, { status: "completed", images: [{ url: PICTURE }] }];
    const urls = await settle(awaitImages("req-1"));
    expect(urls).toEqual([PICTURE]);
    expect(calls.filter((c) => c.url.endsWith("/status"))).toHaveLength(3);
  });

  it("submits, waits and downloads in one go", async () => {
    const out = await settle(generate({ prompt: "x", shape: "tall" }));
    expect(out.requestId).toBe("req-1");
    expect([...out.bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);
    // The download is a public link and carries no key.
    const dl = calls.find((c) => c.url === PICTURE);
    expect((dl?.init?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  it("says why when the job fails or is declined as unsafe", async () => {
    statuses = [{ status: "failed", error: "Generation failed" }];
    await expect(settle(awaitImages("req-1"))).rejects.toThrow(/could not make the picture: Generation failed/);
    statuses = [{ status: "nsfw" }];
    await expect(settle(awaitImages("req-1"))).rejects.toThrow(/declined the picture as unsafe/);
  });
});

describe("what stops a whole run", () => {
  it("a missing key, before anything is sent", async () => {
    delete process.env.HIGGSFIELD_API_KEY;
    const err = await failure(submit({ prompt: "x", shape: "square" }));
    expect(err.code).toBe("run_blocked");
    expect(err.message).toMatch(/HIGGSFIELD_API_KEY is not set/);
    expect(calls).toHaveLength(0);
  });

  it("a refused key and an empty balance", async () => {
    vi.stubGlobal("fetch", async () => json({ detail: "Invalid credentials" }, 401));
    let err = await failure(submit({ prompt: "x", shape: "square" }));
    expect(err.code).toBe("run_blocked");
    expect(err.message).toMatch(/refused the key/);
    vi.stubGlobal("fetch", async () => json({ detail: "Insufficient credits" }, 403));
    err = await failure(submit({ prompt: "x", shape: "square" }));
    expect(err.code).toBe("run_blocked");
    expect(err.message).toMatch(/out of funds/);
  });

  it("but not a refused request, which is this picture's own problem", async () => {
    vi.stubGlobal("fetch", async () => json({ detail: [{ msg: "prompt is required" }] }, 422));
    const err = await failure(submit({ prompt: "", shape: "square" }));
    expect(err.code).toBeUndefined();
    expect(err.message).toBe("Higgsfield refused the request: prompt is required");
  });
});
