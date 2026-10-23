import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The MCP line is replaced: `withHiggsfield` hands the code under test a
 * fake client whose `callTool` answers from a script, one reply per call.
 * The real helpers (`parseToolResult`, `textOf`, `NotConnected`) stay.
 */
const calls: { name: string; args: Record<string, unknown> }[] = [];
let replies: unknown[] = [];
let sessionError: Error | null = null;

vi.mock("@/server/carousel/services/higgsfield-mcp", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/server/carousel/services/higgsfield-mcp")>();
  return {
    ...real,
    withHiggsfield: async (fn: (client: unknown) => Promise<unknown>) => {
      if (sessionError) throw sessionError;
      const client = {
        callTool: async ({ name, arguments: args }: { name: string; arguments: Record<string, unknown> }) => {
          calls.push({ name, args });
          const next = replies.shift();
          if (next instanceof Error) return { isError: true, content: [{ type: "text", text: next.message }] };
          return { content: [{ type: "text", text: JSON.stringify(next ?? {}) }] };
        },
      };
      return fn(client);
    },
  };
});

import { NotConnected } from "@/server/carousel/services/higgsfield-mcp";
import { HiggsfieldError, MODEL, SHAPES, awaitImages, generate, isShape, submit } from "./higgsfield";

const PICTURE = "https://cdn.higgsfield.test/out/1.png";
const JOB = "cead5e40-81c8-42d2-aead-556e60298908";
const submitted = { jobs: [{ index: 0, job_id: JOB, status: "pending" }], submitted_count: 1, failed_count: 0 };
const done = { jobs: [{ index: 0, job_id: JOB, status: "completed", type: "image", result_url: PICTURE }], all_terminal: true };

beforeEach(() => {
  calls.length = 0;
  replies = [];
  sessionError = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** What a call threw, as the error it is. */
async function failure(p: Promise<unknown>): Promise<HiggsfieldError> {
  const err = await p.then(() => null, (e: unknown) => e);
  if (!(err instanceof HiggsfieldError)) throw new Error(`expected a HiggsfieldError, got ${String(err)}`);
  return err;
}

describe("asking Higgsfield for a picture", () => {
  it("submits one Soul 2 job from the prompt alone, with the shape, on credits", async () => {
    replies = [submitted];
    const out = await submit({ prompt: "A kitchen in morning light", shape: "portrait" });
    expect(out.requestId).toBe(JOB);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("generate_image_batch");
    const requests = calls[0].args.requests as { index: number; params: Record<string, unknown> }[];
    expect(requests).toHaveLength(1);
    expect(requests[0].params).toEqual({ model: MODEL, prompt: "A kitchen in morning light", aspect_ratio: "3:4", quality: "1.5k", use_unlim: false });
  });

  it("imports the base picture first and passes it as the image reference", async () => {
    replies = [{ media_id: "11111111-2222-4333-8444-555555555555" }, submitted];
    await submit({ prompt: "Same woman, now outdoors", shape: "square", baseImageUrl: "https://pub.test/a.jpg" });
    expect(calls.map((c) => c.name)).toEqual(["media_import_url", "generate_image_batch"]);
    expect(calls[0].args).toEqual({ url: "https://pub.test/a.jpg", type: "image" });
    const requests = calls[1].args.requests as { params: Record<string, unknown> }[];
    expect(requests[0].params).toMatchObject({ aspect_ratio: "1:1", medias: [{ role: "image", value: "11111111-2222-4333-8444-555555555555" }] });
  });

  it("knows the three shapes and nothing else", () => {
    expect(SHAPES).toEqual({ portrait: "3:4", tall: "9:16", square: "1:1" });
    expect(isShape("tall")).toBe(true);
    expect(isShape("4:5")).toBe(false);
    expect(isShape(null)).toBe(false);
  });

  it("waits through pending polls, then hands back the link", async () => {
    replies = [{ jobs: [{ index: 0, job_id: JOB, status: "pending" }], all_terminal: false }, { jobs: [{ index: 0, job_id: JOB, status: "processing" }], all_terminal: false }, done];
    const urls = await awaitImages(JOB);
    expect(urls).toEqual([PICTURE]);
    expect(calls.filter((c) => c.name === "jobs_wait")).toHaveLength(3);
    expect(calls[0].args).toEqual({ jobs: [{ index: 0, job_id: JOB }], timeout_seconds: 15 });
  });

  it("submits, waits and downloads in one go", async () => {
    replies = [submitted, done];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(PICTURE);
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { status: 200, headers: { "Content-Type": "image/png" } });
    });
    const out = await generate({ prompt: "x", shape: "tall" });
    expect(out.requestId).toBe(JOB);
    expect([...out.bytes.subarray(0, 2)]).toEqual([0x89, 0x50]);
  });

  it("says why when the job fails or is declined as unsafe", async () => {
    replies = [{ jobs: [{ index: 0, job_id: JOB, status: "failed", error: "Generation failed" }], all_terminal: true }];
    await expect(awaitImages(JOB)).rejects.toThrow(/could not make the picture: Generation failed/);
    replies = [{ jobs: [{ index: 0, job_id: JOB, status: "nsfw" }], all_terminal: true }];
    await expect(awaitImages(JOB)).rejects.toThrow(/declined the picture as unsafe/);
  });
});

describe("what stops a whole run", () => {
  it("Higgsfield not connected, before anything is sent", async () => {
    sessionError = new NotConnected();
    const err = await failure(submit({ prompt: "x", shape: "square" }));
    expect(err.code).toBe("run_blocked");
    expect(err.message).toMatch(/not connected/);
    expect(calls).toHaveLength(0);
  });

  it("an expired sign-in and an empty balance", async () => {
    sessionError = new NotConnected("Higgsfield's sign-in has expired. Reconnect it from Settings");
    let err = await failure(submit({ prompt: "x", shape: "square" }));
    expect(err.code).toBe("run_blocked");
    expect(err.message).toMatch(/expired/);
    sessionError = null;
    replies = [new Error("Insufficient credits: 1 required, 0 available")];
    err = await failure(submit({ prompt: "x", shape: "square" }));
    expect(err.code).toBe("run_blocked");
    expect(err.message).toMatch(/out of credits/);
  });

  it("but not a refused request, which is this picture's own problem", async () => {
    replies = [new Error("prompt is required")];
    const err = await failure(submit({ prompt: "", shape: "square" }));
    expect(err.code).toBeUndefined();
    expect(err.message).toBe("prompt is required");
  });
});
