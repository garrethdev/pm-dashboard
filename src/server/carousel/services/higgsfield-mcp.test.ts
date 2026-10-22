import { describe, expect, it } from "vitest";
import { decodeIdToken, expiresAtFrom, mergeTokens, parseToolResult } from "./higgsfield-mcp";

const jwt = (payload: Record<string, unknown>) => `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;

describe("decodeIdToken", () => {
  it("reads the email and name, lower-casing the email", () => {
    expect(decodeIdToken(jwt({ email: "Garreth.Dottin1@Gmail.com", given_name: "Garreth", family_name: "D" }))).toEqual({ email: "garreth.dottin1@gmail.com", name: "Garreth D" });
  });
  it("prefers a full name when the token carries one", () => {
    expect(decodeIdToken(jwt({ email: "a@b.c", name: "Garreth Dottin", given_name: "G" })).name).toBe("Garreth Dottin");
  });
  it("gives nothing for a missing or broken token", () => {
    expect(decodeIdToken(undefined)).toEqual({ email: null, name: null });
    expect(decodeIdToken("not-a-token")).toEqual({ email: null, name: null });
    expect(decodeIdToken("a.!!!.c")).toEqual({ email: null, name: null });
  });
});

describe("expiresAtFrom", () => {
  it("adds expires_in seconds to now", () => {
    expect(expiresAtFrom({ expires_in: 3600 }, Date.UTC(2026, 9, 22, 12, 0, 0))).toBe("2026-10-22T13:00:00.000Z");
  });
  it("is null when the server did not say", () => {
    expect(expiresAtFrom({}, 0)).toBeNull();
    expect(expiresAtFrom({ expires_in: 0 }, 0)).toBeNull();
  });
});

describe("mergeTokens", () => {
  const previous = { access_token: "old", token_type: "Bearer", refresh_token: "keep-me", id_token: "id-old" };
  it("keeps the refresh and ID tokens a refresh reply left out", () => {
    const merged = mergeTokens({ access_token: "new", token_type: "Bearer", expires_in: 60 }, previous);
    expect(merged).toEqual({ access_token: "new", token_type: "Bearer", expires_in: 60, refresh_token: "keep-me", id_token: "id-old" });
  });
  it("takes a rotated refresh token over the old one", () => {
    expect(mergeTokens({ access_token: "new", token_type: "Bearer", refresh_token: "rotated" }, previous).refresh_token).toBe("rotated");
  });
  it("copes with nothing held before", () => {
    expect(mergeTokens({ access_token: "new", token_type: "Bearer" }, null)).toEqual({ access_token: "new", token_type: "Bearer" });
  });
});

describe("parseToolResult", () => {
  it("prefers the structured result", () => {
    expect(parseToolResult({ structuredContent: { credits: 5 }, content: [{ type: "text", text: "{\"credits\":1}" }] })).toEqual({ credits: 5 });
  });
  it("reads JSON out of the text", () => {
    expect(parseToolResult({ content: [{ type: "text", text: "{\"credits\":8552.5,\"subscription_plan_type\":\"ultra\"}" }] })).toEqual({ credits: 8552.5, subscription_plan_type: "ultra" });
  });
  it("hands back plain text as text, and nothing as null", () => {
    expect(parseToolResult({ content: [{ type: "text", text: "hello" }] })).toBe("hello");
    expect(parseToolResult({ content: [] })).toBeNull();
    expect(parseToolResult({ content: [{ type: "image", data: "..." }] })).toBeNull();
  });
});
