import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateMcp, hashToken, parseTokenList } from "@/server/mcp/auth";
import { CALLS_PER_MINUTE, resetGate, underLimit } from "@/server/mcp/gate";

const TOKEN = "a-long-random-test-token-0123456789";
const env = (tokens: string) => ({ MCP_TOKENS: tokens });

describe("MCP door", () => {
  beforeEach(() => {
    vi.stubEnv("ALLOWED_EMAILS", "garreth@example.com,czed@example.com");
    vi.stubEnv("REVIEWER_EMAILS", "garreth@example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("stays shut when no token is configured", () => {
    const r = authenticateMcp(`Bearer ${TOKEN}`, env(""));
    expect(r).toMatchObject({ ok: false, status: 503 });
  });

  it("lets in the right token for an allowed email", () => {
    const r = authenticateMcp(`Bearer ${TOKEN}`, env(`garreth@example.com=${hashToken(TOKEN)}`));
    expect(r).toEqual({ ok: true, caller: { email: "garreth@example.com", reviewer: true, via: "token" } });
  });

  it("refuses a wrong or missing token", () => {
    const tokens = env(`garreth@example.com=${hashToken(TOKEN)}`);
    expect(authenticateMcp("Bearer nope", tokens)).toMatchObject({ ok: false, status: 401 });
    expect(authenticateMcp(null, tokens)).toMatchObject({ ok: false, status: 401 });
    expect(authenticateMcp(TOKEN, tokens)).toMatchObject({ ok: false, status: 401 });
  });

  it("refuses a valid token whose email is not on ALLOWED_EMAILS", () => {
    const r = authenticateMcp(`Bearer ${TOKEN}`, env(`stranger@example.com=${hashToken(TOKEN)}`));
    expect(r).toMatchObject({ ok: false, status: 401 });
  });

  it("marks non-reviewers so the sessions tool stays hidden", () => {
    const r = authenticateMcp(`Bearer ${TOKEN}`, env(`czed@example.com=${hashToken(TOKEN)}`));
    expect(r).toMatchObject({ ok: true, caller: { email: "czed@example.com", reviewer: false } });
  });

  it("ignores AUTH_BYPASS", () => {
    vi.stubEnv("AUTH_BYPASS", "true");
    expect(authenticateMcp(null, env(`garreth@example.com=${hashToken(TOKEN)}`))).toMatchObject({ ok: false, status: 401 });
  });

  it("skips malformed entries instead of trusting them", () => {
    const list = parseTokenList(`garreth@example.com=${hashToken(TOKEN)}, broken, nobody=abc, x@y.z=${"0".repeat(63)}`);
    expect(list.map((e) => e.email)).toEqual(["garreth@example.com"]);
  });
});

describe("MCP call limit", () => {
  afterEach(() => resetGate());

  it("stops a person after the per-minute limit and lets them back a minute later", () => {
    const t = 1_000_000;
    for (let i = 0; i < CALLS_PER_MINUTE; i++) expect(underLimit("a@b.c", t + i)).toBe(true);
    expect(underLimit("a@b.c", t + CALLS_PER_MINUTE)).toBe(false);
    expect(underLimit("other@b.c", t)).toBe(true);
    expect(underLimit("a@b.c", t + 61_000 + CALLS_PER_MINUTE)).toBe(true);
  });
});
