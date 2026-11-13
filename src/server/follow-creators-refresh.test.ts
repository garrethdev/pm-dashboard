import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiUnavailable, classify, type Candidate } from "./follow-creators-refresh";

// The AI's answer is the one part of the monthly top-up that had not met a
// real reply when it was built (OpenRouter was out of credit, 2026-11-13).
// These pin how a reply is read.

const cand = (handle: string): Candidate => ({
  handle,
  followers: 1200,
  bestUrl: "https://www.tiktok.com/@x/video/1",
  bestComments: 9,
  captions: ["down 30 lbs on my glp1 journey"],
  profile: { found: true, followers: 1200, name: "Jo", bio: "48, mom, GLP-1 journey", link: null, photo: null, isPrivate: false, userId: "1", daysSincePost: null },
});

function reply(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}

beforeEach(() => vi.stubEnv("OPENROUTER_API_KEY", "test-key"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("classify", () => {
  it("reads keep and reject, whatever the case or @ the handle comes back with", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      reply(
        'Here you go:\n```json\n{"results":[{"handle":"@Anna.Fit","keep":true,"reason":"her own journey"},{"handle":"coachbea","keep":false,"reason":"sells coaching"}]}\n```',
      ),
    );
    const v = await classify([cand("anna.fit"), cand("coachbea")]);
    expect(v.get("anna.fit")).toEqual({ keep: true, reason: "her own journey" });
    expect(v.get("coachbea")).toEqual({ keep: false, reason: "sells coaching" });
  });

  it("treats anything but a literal true as reject", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply('{"results":[{"handle":"a","keep":"yes"}]}'));
    expect((await classify([cand("a")])).get("a")?.keep).toBe(false);
  });

  it("returns nothing for an unreadable answer, so nobody is added", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply("sorry, I cannot help"));
    expect((await classify([cand("a")])).size).toBe(0);
  });

  it("sends the model the creators' bios and captions", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply('{"results":[]}'));
    await classify([cand("a")]);
    const body = JSON.parse(String((f.mock.calls[0]![1] as RequestInit).body)) as { model: string; messages: { content: string }[] };
    expect(body.model).toBe("anthropic/claude-haiku-5.5");
    expect(body.messages[0]!.content).toContain("48, mom, GLP-1 journey");
    expect(body.messages[0]!.content).toContain("down 30 lbs on my glp1 journey");
  });

  it("stops with AiUnavailable when out of credit, busy or without a key", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply("", 402));
    await expect(classify([cand("a")])).rejects.toBeInstanceOf(AiUnavailable);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply("", 429));
    await expect(classify([cand("a")])).rejects.toBeInstanceOf(AiUnavailable);
    vi.stubEnv("OPENROUTER_API_KEY", "");
    await expect(classify([cand("a")])).rejects.toBeInstanceOf(AiUnavailable);
  });
});
