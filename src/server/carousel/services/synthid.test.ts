import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removeSynthId } from "./synthid";

const API = "https://synthid.test";

/** A tiny PNG stands in for a real render; a second one is what the API hands back. */
async function png(r: number, g: number, b: number, size = 8): Promise<Buffer> {
  return sharp({ create: { width: size, height: size, channels: 3, background: { r, g, b } } }).png().toBuffer();
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
}

let calls: { url: string; init?: RequestInit }[] = [];
let cleared: Buffer;

async function fetchMock(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  calls.push({ url: String(input), init });
  const url = String(input);
  const method = init?.method ?? "GET";
  if (method === "POST" && url === `${API}/api/batches`) {
    expect(JSON.parse(String(init?.body))).toMatchObject({ count: 1, strength: 0.5, preset: "google", seed: 0, maxSide: 1536 });
    return json({ id: "batch-1" });
  }
  if (method === "POST" && url.endsWith("/files")) return json({ id: "0001" });
  if (method === "POST" && url.endsWith("/start")) return json({ queued: 1 });
  if (method === "GET" && url.endsWith("/api/batches/batch-1")) {
    return json({
      summary: { total: 1, done: 1, error: 0, cancelled: 0 },
      batch: { items: [{ id: "0001", name: "edit.png", status: "done", output: "0001_edit_clear.png", error: null }] },
    });
  }
  if (method === "GET" && url.includes("/output/")) return new Response(new Uint8Array(cleared), { status: 200, headers: { "Content-Type": "image/png" } });
  throw new Error(`unexpected ${method} ${url}`);
}

beforeEach(async () => {
  cleared = await png(200, 190, 180, 4);
  process.env.SYNTHID_API_KEY = "sk_test";
  process.env.SYNTHID_API_URL = API;
  calls = [];
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SYNTHID_API_KEY;
  delete process.env.SYNTHID_API_URL;
});

describe("the SynthID removal step", () => {
  it("runs a batch of one and returns the cleared picture", async () => {
    const inPng = await png(10, 20, 30);
    const out = await removeSynthId(inPng);
    expect(out.batchId).toBe("batch-1");
    expect(out.bytes.equals(cleared)).toBe(true);
    expect(calls.map((c) => `${c.init?.method ?? "GET"} ${c.url}`)).toEqual([
      `POST ${API}/api/batches`,
      `POST ${API}/api/batches/batch-1/files`,
      `POST ${API}/api/batches/batch-1/start`,
      `GET ${API}/api/batches/batch-1`,
      `GET ${API}/files/batch-1/output/0001_edit_clear.png`,
    ]);
  });

  it("keys every request and sends the file as multipart", async () => {
    await removeSynthId(await png(1, 2, 3));
    for (const c of calls) {
      expect((c.init?.headers as Record<string, string>).Authorization).toBe("Bearer sk_test");
    }
    const upload = calls.find((c) => c.url.endsWith("/files"));
    expect((upload?.init?.headers as Record<string, string>)["Content-Type"]).toMatch(/^multipart\/form-data; boundary=/);
  });

  it("refuses when the key is not set", async () => {
    delete process.env.SYNTHID_API_KEY;
    await expect(removeSynthId(await png(1, 2, 3))).rejects.toThrow(/SYNTHID_API_KEY is not set/);
  });
});