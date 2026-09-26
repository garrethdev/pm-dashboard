import { describe, expect, it, vi } from "vitest";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { buildWritingContract } from "./contract";
import { writeAndCheck } from "./write-and-check";
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
