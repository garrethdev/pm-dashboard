import { describe, expect, it, vi } from "vitest";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { buildWritingContract } from "./contract";
import { writeAndCheck, reviseAndCheck } from "./write-and-check";
function setup() {
  const template = structuredClone(eye);
  Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  const input = { template, direction: { version: 1, text: "Be specific" }, choices: {} };
  const c = buildWritingContract(input);
  const options = {
    contentId: "draft-version-3", contentType: "covered_eye", hookRole: template.slides[0].text[0].role,
    modelId: "test-model", generate: vi.fn(async () => ({ roles: Object.fromEntries(c.roles.map(r => [r.role, "Copy"])), caption: "Caption", music: "Artist - Title" })),
    gates: { compliance: vi.fn(() => []), score: vi.fn(async () => ({ score: 8, suggestions: [] })), risk: vi.fn(async () => ({ risk_level: "low", action: "approve", violations: [], llm_reasons: [], suggestions: [] })) },
  };
  return { input, options };
}
describe("write and check one version", () => {
  it.each(["track", "deck"] as const)("rechecks a %s revision using the new identity", async kind => {
    const { input, options } = setup();
    const contract = buildWritingContract(input);
    const oldCopy = await options.generate();
    const previous = { contentId: "old-version", version: 2, copy: { ...oldCopy, roles: { ...oldCopy.roles, ...contract.supplied } } };
    const result = await reviseAndCheck(input, previous, { ...options, expectedVersion: 2, scope: { kind }, feedback: "Try again" });
    expect(result.state).toBe("awaiting_music");
    expect(result.writing.metadata).toMatchObject({ previous_version: 2, version: 3 });
    expect(options.gates.risk).toHaveBeenCalledTimes(1);
    expect(options.gates.risk).toHaveBeenCalledWith({ items: [expect.objectContaining({ content_id: options.contentId })] }, expect.any(AbortSignal));
  });
  it("does not reuse the prior content identity", async () => {
    const { input, options } = setup();
    const copy = { roles: {}, caption: "Caption", music: "Artist - Title" };
    await expect(reviseAndCheck(input, { contentId: options.contentId, version: 2, copy }, { ...options, expectedVersion: 2, scope: { kind: "deck" }, feedback: "" })).rejects.toThrow("new draft identity");
    expect(options.generate).not.toHaveBeenCalled();
    expect(options.gates.risk).not.toHaveBeenCalled();
  });
  it("retains revised copy while flagging a fresh risk failure", async () => {
    const { input, options } = setup();
    const copy = await options.generate();
    options.gates.risk.mockRejectedValue(new Error("Offline"));
    const result = await reviseAndCheck(input, { contentId: "old", version: 2, copy }, { ...options, expectedVersion: 2, scope: { kind: "deck" }, feedback: "" });
    expect(result.state).toBe("flagged");
    expect(result.writing.copy).not.toBeNull();
    expect(result.gate?.reasons).toContain("Not gated");
  });
  it("validates gate configuration before incurring a writer request", async () => {
    const { input, options } = setup();
    await expect(writeAndCheck(input, { ...options, timeoutMs: -1 })).rejects.toThrow("timeout");
    expect(options.generate).not.toHaveBeenCalled();
  });
  it("runs gates for valid copy but stops before music and approval", async () => {
    const { input, options } = setup();
    const result = await writeAndCheck(input, options);
    expect(result.state).toBe("awaiting_music");
    expect(options.gates.risk).toHaveBeenCalledWith({ items: [expect.objectContaining({ content_id: "draft-version-3", text_hook: "Copy" })] }, expect.any(AbortSignal));
  });
  it("does not gate invalid generated copy", async () => {
    const { input, options } = setup(); options.generate.mockRejectedValue(new Error("Offline"));
    expect((await writeAndCheck(input, options)).state).toBe("failed");
    expect(options.gates.risk).not.toHaveBeenCalled();
  });
  it("retains written copy when the gate fails", async () => {
    const { input, options } = setup(); options.gates.risk.mockRejectedValue(new Error("Offline"));
    const result = await writeAndCheck(input, options);
    expect(result.state).toBe("flagged");
    expect(result.writing.copy?.caption).toBe("Caption");
    expect(result.gate?.reasons).toContain("Not gated");
  });
  it("rejects a hidden hook role before contacting the writer", async () => {
    const { input, options } = setup(); options.hookRole = "transition_line";
    await expect(writeAndCheck(input, options)).rejects.toThrow("opening slide");
    expect(options.generate).not.toHaveBeenCalled();
  });
});
