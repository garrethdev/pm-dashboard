import { describe, expect, it, vi } from "vitest";
import { evaluateCopy, type GateAdapters } from "./evaluate";
const item = { content_id: "draft-version-2", type: "covered_eye", text_hook: "A hook", caption: "Caption", on_screen_text: "Slides" };
const verdict = { risk_level: "low", action: "approve", violations: [], llm_reasons: ["No issue"], suggestions: [] };
function adapters(): GateAdapters {
  return { compliance: vi.fn(() => []), score: vi.fn(async () => ({ score: 8, suggestions: [] })), risk: vi.fn(async () => verdict) };
}
describe("copy quality orchestration", () => {
  it.each([
    { risk_level: ["high"] }, { action: ["delete"] },
    { risk_level: { toString: (): string => "high" } }, { action: { toString: (): string => "review" } },
  ])("rejects coercible non-string risk enums: %j", async malformed => {
    const a = adapters(); a.risk = async () => ({ ...verdict, ...malformed });
    const result = await evaluateCopy(item, a);
    expect(result.state).toBe("flagged");
    expect(result.reasons).toContain("Not gated");
    expect(result.risk).toBeNull();
  });
  it("captures identity and adapters before queued provider calls", async () => {
    const original = { ...item }, a = adapters(), risk = a.risk;
    const pending = evaluateCopy(original, a);
    original.content_id = "changed";
    a.risk = vi.fn(async () => { throw new Error("Wrong adapter"); });
    expect((await pending).state).toBe("copy_checks_passed");
    expect(risk).toHaveBeenCalledWith({ items: [item] }, expect.any(AbortSignal));
    expect(a.risk).not.toHaveBeenCalled();
  });
  it("retains a received rejection while waiting for the scorer", async () => {
    vi.useFakeTimers();
    try {
      const a = adapters();
      const evidence = { ...verdict, risk_level: "high", violations: ["Original violation"] };
      a.risk = async () => evidence;
      a.score = async () => new Promise(resolve => setTimeout(() => resolve({ score: 8, suggestions: [] }), 50));
      const pending = evaluateCopy(item, a, 100);
      await vi.advanceTimersByTimeAsync(1);
      evidence.risk_level = "low"; evidence.violations.length = 0;
      await vi.advanceTimersByTimeAsync(49);
      const result = await pending;
      expect(result.state).toBe("flagged");
      expect(result.reasons).toEqual(["Original violation"]);
      expect(result.risk?.risk_level).toBe("high");
    } finally { vi.useRealTimers(); }
  });
  it("retains a received low score while waiting for the risk gate", async () => {
    vi.useFakeTimers();
    try {
      const a = adapters(), evidence = { score: 3, suggestions: ["Rewrite hook"] };
      a.score = async () => evidence;
      a.risk = async () => new Promise(resolve => setTimeout(() => resolve(verdict), 50));
      const pending = evaluateCopy(item, a, 100);
      await vi.advanceTimersByTimeAsync(1);
      evidence.score = 9; evidence.suggestions.length = 0;
      await vi.advanceTimersByTimeAsync(49);
      const result = await pending;
      expect(result.reasons).toEqual(["Score 3"]);
      expect(result.suggestions).toEqual(["Rewrite hook"]);
    } finally { vi.useRealTimers(); }
  });
  it("passes only complete evidence and sends the current version in the risk envelope", async () => {
    const a = adapters();
    expect((await evaluateCopy(item, a)).state).toBe("copy_checks_passed");
    expect(a.risk).toHaveBeenCalledWith({ items: [item] }, expect.any(AbortSignal));
  });
  it.each([5.9, 6, 10])("uses the score boundary for %s", async score => {
    const a = adapters(); a.score = async () => ({ score, suggestions: ["Improve hook"] });
    const result = await evaluateCopy(item, a);
    expect(result.state).toBe(score < 6 ? "flagged" : "copy_checks_passed");
    expect(result.suggestions).toEqual(["Improve hook"]);
  });
  it("runs compliance and retains its findings when both services fail", async () => {
    const a = adapters(); a.compliance = vi.fn(() => ["brand name"]);
    a.score = a.risk = async () => { throw new Error("secret response"); };
    const result = await evaluateCopy(item, a);
    expect(result.reasons).toEqual(["Compliance: brand name", "Not scored", "Not gated"]);
    expect(result.retryable).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secret");
  });
  it.each([null, {}, { score: NaN, suggestions: [] }, { score: 11, suggestions: [] }, { score: 8, suggestions: "bad" }])("rejects malformed scores", async value => {
    const a = adapters(); a.score = async () => value;
    expect((await evaluateCopy(item, a)).reasons).toContain("Not scored");
  });
  it("preserves risk evidence and rejection suggestions", async () => {
    const a = adapters(); a.risk = async () => ({ ...verdict, risk_level: "high", violations: ["Claim"], llm_reasons: ["Visible wording"], suggestions: ["Reword"] });
    const result = await evaluateCopy(item, a);
    expect(result.reasons).toEqual(["Claim"]);
    expect(result.risk?.llm_reasons).toEqual(["Visible wording"]);
    expect(result.suggestions).toEqual(["Reword"]);
  });
  it.each(["delete", "review"])("never passes a %s instruction", async action => {
    const a = adapters(); a.risk = async () => ({ ...verdict, action });
    expect((await evaluateCopy(item, a)).state).toBe("flagged");
  });
  it.each([null, {}, { ...verdict, action: "unknown" }])("fails closed on missing or malformed risk evidence", async value => {
    const a = adapters(); a.risk = async () => value;
    expect((await evaluateCopy(item, a)).reasons).toContain("Not gated");
  });
  it("fails closed when compliance cannot run", async () => {
    const a = adapters(); a.compliance = () => { throw new Error("Unavailable"); };
    expect((await evaluateCopy(item, a)).reasons).toEqual(["Compliance check failed"]);
  });
  it("bounds stalled providers and aborts their requests", async () => {
    vi.useFakeTimers();
    try {
      const a = adapters(); let signal: AbortSignal | undefined;
      a.score = async (_, s) => { signal = s; return new Promise(() => {}); };
      const pending = evaluateCopy(item, a, 100);
      await vi.advanceTimersByTimeAsync(100);
      expect((await pending).reasons).toEqual(["Not scored"]);
      expect(signal?.aborted).toBe(true);
    } finally { vi.useRealTimers(); }
  });
  it("validates before transmitting malformed input", async () => {
    const a = adapters();
    await expect(evaluateCopy({ ...item, content_id: "" }, a)).rejects.toThrow("content_id");
    expect(a.risk).not.toHaveBeenCalled();
  });
});
