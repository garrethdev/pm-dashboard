import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOpenRouterWriter } from "./openrouter";
beforeEach(() => { vi.stubEnv("OPENROUTER_API_KEY", "test-secret"); vi.stubEnv("CAROUSEL_WRITER_MODEL", "vendor/model"); });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
const completion = (content = '{"roles":{},"caption":"Caption","music":"Artist - Title"}', finish_reason = "stop") => Response.json({ choices: [{ finish_reason, message: { content } }] });
describe("OpenRouter writer adapter", () => {
  it("uses the configured model, fixed endpoint, JSON mode and safe request settings", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(completion());
    const writer = createOpenRouterWriter(fetcher);
    expect(await writer.generate("Contract")).toMatchObject({ caption: "Caption" });
    expect(writer.modelId).toBe("vendor/model");
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(request).toMatchObject({ redirect: "error", cache: "no-store" });
    expect(JSON.parse(request!.body as string)).toMatchObject({ model: "vendor/model", response_format: { type: "json_object" }, max_tokens: 4096 });
  });
  it.each(["OPENROUTER_API_KEY", "CAROUSEL_WRITER_MODEL"])("fails before any request without %s", key => {
    vi.stubEnv(key, ""); const fetcher = vi.fn<typeof fetch>();
    expect(() => createOpenRouterWriter(fetcher)).toThrow("NOT_CONFIGURED");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not transmit an empty prompt", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(createOpenRouterWriter(fetcher).generate(" ")).rejects.toThrow("INVALID_PROMPT");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["length", "content_filter", "tool_calls"])("rejects finish reason %s", async reason => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(completion("{}", reason));
    await expect(createOpenRouterWriter(fetcher).generate("Contract")).rejects.toThrow("INVALID_OUTPUT");
  });
  it.each(["not JSON", "[]", "null", "```json\n{}\n```"])("rejects invalid object output", async content => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(completion(content));
    await expect(createOpenRouterWriter(fetcher).generate("Contract")).rejects.toThrow("INVALID_OUTPUT");
  });
  it("does not leak an error body or automatically retry", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("test-secret", { status: 429 }));
    await expect(createOpenRouterWriter(fetcher).generate("Contract")).rejects.toThrow("UNAVAILABLE");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("aborts a stalled HTTP request", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_, init) => new Promise((_, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new Error("secret")));
    }));
    const assertion = expect(createOpenRouterWriter(fetcher).generate("Contract")).rejects.toThrow("UNAVAILABLE");
    await vi.advanceTimersByTimeAsync(45_000);
    await assertion;
  });
});
